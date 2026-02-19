import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { geocodeAddress } from "@/lib/naver-geocode";

// POST /api/geocode/batch - DB 내 기존 주소 일괄 좌표 변환
export async function POST(request: NextRequest) {
  try {
    // 간단한 인증 체크 (관리자 토큰 또는 비밀 키)
    const { secret, limit = 100, offset = 0 } = await request.json().catch(() => ({ secret: "", limit: 100, offset: 0 }));
    const expectedSecret = process.env.BATCH_GEOCODE_SECRET || "batch-geocode-secret";

    if (secret !== expectedSecret) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 },
      );
    }

    const results = {
      training_centers: { total: 0, success: 0, failed: 0, errors: [] as string[] },
      training_institution: { total: 0, success: 0, failed: 0, errors: [] as string[] },
    };

    // 1. training_centers - latitude가 null인 레코드 조회
    const { data: centers } = await supabaseAdmin
      .from("training_centers")
      .select("id, address")
      .is("latitude", null);

    if (centers && centers.length > 0) {
      results.training_centers.total = centers.length;

      for (const center of centers) {
        if (!center.address) {
          results.training_centers.failed++;
          results.training_centers.errors.push(
            `ID ${center.id}: 주소 없음`,
          );
          continue;
        }

        try {
          const coords = await geocodeAddress(center.address);

          if (coords) {
            await supabaseAdmin
              .from("training_centers")
              .update({
                latitude: coords.latitude,
                longitude: coords.longitude,
              })
              .eq("id", center.id);

            results.training_centers.success++;
          } else {
            results.training_centers.failed++;
            results.training_centers.errors.push(
              `ID ${center.id}: 좌표 변환 실패 (${center.address})`,
            );
          }
        } catch (err) {
          results.training_centers.failed++;
          results.training_centers.errors.push(
            `ID ${center.id}: 오류 발생`,
          );
        }

        // Naver API 레이트 리밋 준수 (약 6-7 요청/초)
        await delay(150);
      }
    }

    // 2. training_institution - latitude가 null이고 full_address가 있는 레코드만 조회
    const { data: institutions } = await supabaseAdmin
      .from("training_institution")
      .select("id, name, address1, address2, full_address")
      .is("latitude", null)
      .not("full_address", "is", null)
      .limit(limit);

    if (institutions && institutions.length > 0) {
      results.training_institution.total = institutions.length;

      for (const inst of institutions) {
        if (!inst.full_address) {
          results.training_institution.failed++;
          results.training_institution.errors.push(
            `ID ${inst.id}: 주소 없음`,
          );
          continue;
        }

        try {
          // full_address에 깨진 문자 포함 여부 확인
          const hasBrokenChar = /[^\x00-\x7F\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F\s\d\w\-\(\),.\/~·]/.test(inst.full_address);

          let cleanAddress = "";
          if (hasBrokenChar && inst.address1 && inst.address2) {
            // 깨진 문자 있으면 address1+address2로 fallback
            cleanAddress = `${inst.address1} ${inst.address2}`.trim();
          } else {
            cleanAddress = extractAddress(inst.full_address, inst.name);
          }

          const coords = await geocodeAddress(cleanAddress);

          if (coords) {
            await supabaseAdmin
              .from("training_institution")
              .update({
                latitude: coords.latitude,
                longitude: coords.longitude,
              })
              .eq("id", inst.id);

            results.training_institution.success++;
          } else {
            results.training_institution.failed++;
            results.training_institution.errors.push(
              `ID ${inst.id}: 좌표 변환 실패 (${inst.full_address})`,
            );
          }
        } catch (err) {
          results.training_institution.failed++;
          results.training_institution.errors.push(
            `ID ${inst.id}: 오류 발생`,
          );
        }

        await delay(150);
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("[Batch Geocode] 오류:", error);
    return NextResponse.json(
      { error: "일괄 좌표 변환 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * full_address에서 네이버 Geocoding에 넣을 순수 주소 추출
 *
 * 규칙:
 * - 쉼표 앞부분이 항상 유효한 주소 (도로명 or 지번)
 * - 쉼표 뒤는 층수/호수/기관명 등 부가정보 → 버림
 * - 단, 지번 주소인 경우(쉼표 앞에 번지 없음) 쉼표 뒤 번지를 합침
 * - 괄호 안 동/읍/면/리는 유지, 나머지 부가정보 제거
 * - 공백 중복 제거
 */
function extractAddress(fullAddress: string, name?: string | null): string {
  let address = fullAddress.trim();

  // 1. 기관명 제거
  if (name && address.includes(name)) {
    address = address.replace(name, "").trim();
  }

  // 2. 쉼표 기준 분리
  const parts = address.split(",").map((s: string) => s.trim()).filter(Boolean);

  if (parts.length === 1) {
    return cleanUp(parts[0]);
  }

  const before = parts[0]; // 쉼표 앞
  const after = parts[1];  // 쉼표 뒤 첫 번째

  // 3. 도로명이 쉼표 앞에서 끊긴 경우: "숲속마을로, 1 71 901호" → 앞+뒤 번지 합치기
  //    도로명 끝이 로/길/대로로 끝나고 뒤가 숫자면 합치기
  const beforeEndsWithRoad = /[로길]$/.test(before);
  if (beforeEndsWithRoad) {
    const addressNum = after.match(/^[\d-]+/)?.[0] || "";
    if (addressNum) {
      return cleanUp(`${before} ${addressNum}`);
    }
  }

  // 4. 지번 주소: 쉼표 앞에 숫자 없고 뒤가 번지(숫자)로 시작하는 경우 합치기
  //    예) "강원 강릉시 송정동" + "110-71" → 합치기
  //    예) "강원 강릉시 주문진읍 교항6리" + "70번지 연주로334" → 앞+번지만 합치기
  const beforeHasNumber = /\d/.test(before);
  const afterStartsWithNumber = /^\d/.test(after);

  if (!beforeHasNumber && afterStartsWithNumber) {
    // 뒤에서 번지 숫자만 추출 (예: "70번지 연주로334" → "70")
    const bunjiMatch = after.match(/^[\d-]+/);
    const bunji = bunjiMatch ? bunjiMatch[0] : "";
    return cleanUp(`${before} ${bunji}`);
  }

  // 5. 도로명 주소에서 쉼표 뒤가 층/호/기관명인 경우 → 앞만 사용
  return cleanUp(before);
}

/** 주소 문자열 정리: 공백 중복 제거, 불필요한 특수문자 제거 */
function cleanUp(address: string): string {
  return address
    .replace(/\s{2,}/g, " ")  // 연속 공백 제거
    .replace(/[,\.]+$/, "")   // 끝 쉼표/마침표 제거
    .trim();
}
