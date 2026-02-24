import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAICacheManager } from "@google/generative-ai/server";
import type { CachedContent } from "@google/generative-ai";
import { readFileSync } from "fs";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 시스템 인스트럭션 읽기
function getSystemInstruction(): string {
  try {
    const filePath = join(process.cwd(), "system-instruction-detailed.md");
    const content = readFileSync(filePath, "utf-8");
    const match = content.match(/```\n([\s\S]+?)\n```/);
    if (match) return match[1];
  } catch {
    // fallback
  }
  return "너는 학점은행제 평생교육원 전문 상담 챗봇이야. 이름은 '교육 도우미'야. 친절하게 안내해줘.";
}

// ── 컨텍스트 캐시 (모듈 레벨 싱글톤) ──────────────────────────
let _cache: CachedContent | null = null;
let _cachedInstruction = "";

async function getOrCreateCache(
  apiKey: string,
  systemInstruction: string,
): Promise<CachedContent | null> {
  const now = Date.now();

  // 기존 캐시가 유효하면 재사용 (만료 5분 전까지)
  if (_cache && _cachedInstruction === systemInstruction) {
    const expireMs = new Date(_cache.expireTime!).getTime();
    if (expireMs - now > 5 * 60 * 1000) return _cache;
  }

  try {
    const cacheManager = new GoogleAICacheManager(apiKey);
    const modelId = process.env.GEMINI_MODEL || "gemini-2.0-flash-001";
    const model = modelId.startsWith("models/") ? modelId : `models/${modelId}`;

    _cache = await cacheManager.create({
      model,
      systemInstruction,
      contents: [],
      ttlSeconds: 3600, // 1시간
    });
    _cachedInstruction = systemInstruction;
    console.log("[Cache] Created:", _cache.name, "| expires:", _cache.expireTime);
    return _cache;
  } catch (e) {
    console.warn("[Cache] Skipped (fallback to no-cache):", (e as Error).message);
    return null;
  }
}
// ────────────────────────────────────────────────────────────────

// 지역 키워드 → DB address1 검색어 매핑
const REGION_KEYWORDS: Record<string, string> = {
  서울: "서울",
  경기: "경기",
  인천: "인천",
  강원: "강원",
  대전: "대전",
  세종: "세종",
  충남: "충남",
  충북: "충북",
  충청: "충청",
  전북: "전북",
  전라북도: "전북",
  광주: "광주",
  전남: "전남",
  전라남도: "전남",
  대구: "대구",
  경북: "경북",
  경상북도: "경북",
  경남: "경남",
  경상남도: "경남",
  울산: "울산",
  부산: "부산",
  제주: "제주",
};

const PRACTICE_KEYWORDS = ["실습", "실습기관", "현장실습", "실습처", "실습할 곳", "실습 기관"];
const CENTER_KEYWORDS = ["교육원", "평생교육원", "학원", "수강", "등록", "어디서 들어", "어디서 배워", "어디 다녀", "사이버"];

// 메시지에서 지역과 실습 의도 감지
function detectRegionAndIntent(message: string): string | null {
  const hasPracticeIntent = PRACTICE_KEYWORDS.some((kw) => message.includes(kw));
  if (!hasPracticeIntent) return null;

  for (const [keyword, region] of Object.entries(REGION_KEYWORDS)) {
    if (message.includes(keyword)) return region;
  }
  return null;
}

// 메시지에서 지역과 교육원 의도 감지
function detectRegionAndCenterIntent(message: string): string | null {
  const hasCenterIntent = CENTER_KEYWORDS.some((kw) => message.includes(kw));
  if (!hasCenterIntent) return null;

  for (const [keyword, region] of Object.entries(REGION_KEYWORDS)) {
    if (message.includes(keyword)) return region;
  }
  return null;
}

// Supabase 클라이언트 생성 공통 함수
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

// Supabase에서 현장실습기관 개수 조회
async function fetchPracticeInstitutions(region: string): Promise<string> {
  const supabase = getSupabaseClient();
  if (!supabase) return "";

  try {
    const { count, error } = await supabase
      .from("training_institution")
      .select("*", { count: "exact", head: true })
      .ilike("address1", `%${region}%`);

    if (error || count === null) return "";

    const mapLink = `/matching?mode=현장실습기관&region=${encodeURIComponent(region)}&searchMode=location`;

    return `\n\n[현장실습기관 DB 조회 결과]\n지역: ${region}\n총 선정기관 수: ${count}개\n지도 링크: ${mapLink}`;
  } catch {
    return "";
  }
}

// Supabase에서 교육원 개수 조회
async function fetchTrainingCenters(region: string): Promise<string> {
  const supabase = getSupabaseClient();
  if (!supabase) return "";

  try {
    const { count, error } = await supabase
      .from("training_centers")
      .select("*", { count: "exact", head: true })
      .or(`province.ilike.%${region}%,available_region.ilike.%전국%,available_region.ilike.%${region}%`);

    if (error || count === null) return "";

    const mapLink = `/matching?mode=교육원&region=${encodeURIComponent(region)}&searchMode=location`;

    return `\n\n[교육원 DB 조회 결과]\n지역: ${region}\n총 교육원 수: ${count}개\n지도 링크: ${mapLink}`;
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages 필드가 필요합니다" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY가 설정되지 않았습니다" }, { status: 500 });
    }

    const systemInstruction = getSystemInstruction();
    const genAI = new GoogleGenerativeAI(apiKey);

    // 캐시 시도 → 실패 시 일반 모델 사용
    const cache = await getOrCreateCache(apiKey, systemInstruction);
    const model = cache
      ? genAI.getGenerativeModelFromCachedContent(cache)
      : genAI.getGenerativeModel({
          model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
          systemInstruction,
        });

    // 마지막 메시지 (현재 유저 입력)
    const lastMessage: { role: string; content: string } = messages[messages.length - 1];

    // DB 조회 (지역+키워드 감지 시 병렬 실행)
    let dbContext = "";
    const practiceRegion = detectRegionAndIntent(lastMessage.content);
    const centerRegion = detectRegionAndCenterIntent(lastMessage.content);

    const [practiceContext, centerContext] = await Promise.all([
      practiceRegion ? fetchPracticeInstitutions(practiceRegion) : Promise.resolve(""),
      centerRegion ? fetchTrainingCenters(centerRegion) : Promise.resolve(""),
    ]);
    dbContext = practiceContext + centerContext;

    // DB 결과를 유저 메시지에 컨텍스트로 추가
    const enrichedLastContent = lastMessage.content + dbContext;

    // Gemini history (user로 시작해야 함)
    const prevMessages: { role: string; content: string }[] = messages.slice(0, -1);
    const firstUserIdx = prevMessages.findIndex((m) => m.role === "user");
    const history = (firstUserIdx >= 0 ? prevMessages.slice(firstUserIdx) : []).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(enrichedLastContent);
    const text = result.response.text();

    return NextResponse.json({ message: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Chat API] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
