import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { getAllMachineBrands } from "@/app/services/fitness-center/machine.service";
import { logApiError } from "@/app/services/error/error-logging.service";

/**
 * GET /api/machine-brands
 * 모든 머신 브랜드 목록 조회
 */
export async function GET(request: NextRequest) {
  // 1. 세션 확인
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 2. 비즈니스 로직
  try {
    const brands = await getAllMachineBrands();
    return NextResponse.json(brands);
  } catch (error) {
    // 3. 에러 로깅
    await logApiError(request, error as Error, {
      errorCode: "API_MACHINE_BRANDS_001",
      userId: sessionOrResponse.id,
      metadata: { action: "getAllMachineBrands" },
      tags: ["api", "machine-brands"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
