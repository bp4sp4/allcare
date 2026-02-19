/**
 * DB 마이그레이션 + Batch Geocoding 스크립트
 *
 * 실행: npx tsx scripts/migrate-and-geocode.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ujqaqulgmoonhlwiwezm.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqcWFxdWxnbW9vbmhsd2l3ZXptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDAxMDY0NCwiZXhwIjoyMDg1NTg2NjQ0fQ.yOZ-Aa-YvJN18K5URU6IA1aYVFbdWqimFgcM768X5Vk";

const NAVER_CLIENT_ID = "wx5w1boprl";
const NAVER_CLIENT_SECRET = "FnMacaFz2q4laLmMXG8Dm2Mkqf1cIwp4cpwrWQAC";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Geocoding 함수
async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const response = await fetch(
      `https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(address)}`,
      {
        headers: {
          "x-ncp-apigw-api-key-id": NAVER_CLIENT_ID,
          "x-ncp-apigw-api-key": NAVER_CLIENT_SECRET,
        },
      }
    );

    if (!response.ok) {
      console.error(`  ❌ Geocoding API 오류: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (data.meta?.totalCount > 0) {
      return {
        latitude: parseFloat(data.addresses[0].y),
        longitude: parseFloat(data.addresses[0].x),
      };
    }
    return null;
  } catch (error) {
    console.error(`  ❌ Geocoding 오류:`, error);
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("🚀 DB 마이그레이션 + Batch Geocoding 시작\n");

  // Step 1: 마이그레이션 - 컬럼 추가
  console.log("📋 Step 1: DB 마이그레이션 (latitude/longitude 컬럼 추가)");

  try {
    // training_centers 테이블에 컬럼 추가
    const { error: err1 } = await supabase.rpc("exec_sql", {
      sql: "ALTER TABLE training_centers ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION, ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;"
    }).maybeSingle();

    if (err1) {
      // rpc가 없을 수 있으니 직접 확인
      console.log("  ⚠️ RPC 없음 - 직접 컬럼 존재 여부 확인합니다.");
    } else {
      console.log("  ✅ training_centers 컬럼 추가 완료");
    }
  } catch {
    console.log("  ⚠️ RPC 방식 불가 - 컬럼이 이미 존재하는지 확인합니다.");
  }

  // 컬럼 존재 여부 테스트
  const { data: testCenter, error: testErr1 } = await supabase
    .from("training_centers")
    .select("id, latitude, longitude")
    .limit(1);

  if (testErr1) {
    console.error("  ❌ training_centers 테이블에 latitude/longitude 컬럼이 없습니다!");
    console.error("  💡 Supabase 대시보드 SQL Editor에서 아래 SQL을 실행해주세요:");
    console.error("  ALTER TABLE training_centers ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION, ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;");
    console.error("  ALTER TABLE training_institution ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION, ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;");
    process.exit(1);
  }
  console.log("  ✅ training_centers - latitude/longitude 컬럼 확인됨");

  const { error: testErr2 } = await supabase
    .from("training_institution")
    .select("id, latitude, longitude")
    .limit(1);

  if (testErr2) {
    console.error("  ❌ training_institution 테이블에 latitude/longitude 컬럼이 없습니다!");
    console.error("  💡 Supabase 대시보드 SQL Editor에서 위 SQL을 실행해주세요.");
    process.exit(1);
  }
  console.log("  ✅ training_institution - latitude/longitude 컬럼 확인됨\n");

  // Step 2: Batch Geocoding - training_centers
  console.log("📋 Step 2: training_centers 주소 → 좌표 변환");

  const { data: centers } = await supabase
    .from("training_centers")
    .select("id, address")
    .is("latitude", null);

  if (centers && centers.length > 0) {
    console.log(`  📍 변환 대상: ${centers.length}개\n`);
    let success = 0;
    let failed = 0;

    for (let i = 0; i < centers.length; i++) {
      const center = centers[i];
      if (!center.address) {
        console.log(`  [${i + 1}/${centers.length}] ID ${center.id}: 주소 없음 - 건너뜀`);
        failed++;
        continue;
      }

      const coords = await geocodeAddress(center.address);
      if (coords) {
        const { error } = await supabase
          .from("training_centers")
          .update({ latitude: coords.latitude, longitude: coords.longitude })
          .eq("id", center.id);

        if (error) {
          console.log(`  [${i + 1}/${centers.length}] ID ${center.id}: DB 업데이트 실패`);
          failed++;
        } else {
          console.log(`  [${i + 1}/${centers.length}] ✅ ${center.address} → (${coords.latitude}, ${coords.longitude})`);
          success++;
        }
      } else {
        console.log(`  [${i + 1}/${centers.length}] ❌ ${center.address} → 좌표 변환 실패`);
        failed++;
      }

      await delay(200);
    }

    console.log(`\n  📊 training_centers 결과: 성공 ${success}개, 실패 ${failed}개\n`);
  } else {
    console.log("  ✅ 변환 대상 없음 (모두 좌표 있음)\n");
  }

  // Step 3: Batch Geocoding - training_institution
  console.log("📋 Step 3: training_institution 주소 → 좌표 변환");

  const { data: institutions } = await supabase
    .from("training_institution")
    .select("id, full_address")
    .is("latitude", null);

  if (institutions && institutions.length > 0) {
    console.log(`  📍 변환 대상: ${institutions.length}개\n`);
    let success = 0;
    let failed = 0;

    for (let i = 0; i < institutions.length; i++) {
      const inst = institutions[i];
      if (!inst.full_address) {
        console.log(`  [${i + 1}/${institutions.length}] ID ${inst.id}: 주소 없음 - 건너뜀`);
        failed++;
        continue;
      }

      const coords = await geocodeAddress(inst.full_address);
      if (coords) {
        const { error } = await supabase
          .from("training_institution")
          .update({ latitude: coords.latitude, longitude: coords.longitude })
          .eq("id", inst.id);

        if (error) {
          console.log(`  [${i + 1}/${institutions.length}] ID ${inst.id}: DB 업데이트 실패`);
          failed++;
        } else {
          console.log(`  [${i + 1}/${institutions.length}] ✅ ${inst.full_address} → (${coords.latitude}, ${coords.longitude})`);
          success++;
        }
      } else {
        console.log(`  [${i + 1}/${institutions.length}] ❌ ${inst.full_address} → 좌표 변환 실패`);
        failed++;
      }

      await delay(200);
    }

    console.log(`\n  📊 training_institution 결과: 성공 ${success}개, 실패 ${failed}개\n`);
  } else {
    console.log("  ✅ 변환 대상 없음 (모두 좌표 있음)\n");
  }

  console.log("🎉 완료!");
}

main().catch(console.error);
