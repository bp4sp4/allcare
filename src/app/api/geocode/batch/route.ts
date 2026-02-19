import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { geocodeAddress } from "@/lib/naver-geocode";

// POST /api/geocode/batch - DB 내 기존 주소 일괄 좌표 변환
export async function POST(request: NextRequest) {
  try {
    // 간단한 인증 체크 (관리자 토큰 또는 비밀 키)
    const { secret } = await request.json().catch(() => ({ secret: "" }));
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

    // 2. training_institution - latitude가 null인 레코드 조회
    const { data: institutions } = await supabaseAdmin
      .from("training_institution")
      .select("id, full_address")
      .is("latitude", null);

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
          const coords = await geocodeAddress(inst.full_address);

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
