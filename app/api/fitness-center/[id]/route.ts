import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getManagerCenters } from "@/app/services/manager/dashboard.service";
import { logApiError } from "@/app/services/error/error-logging.service";
import { getCenterEquipmentsSimple } from "@/app/services/fitness-center/equipment.service";

type Params = Promise<{ id: string }>;
// 누구나 접근할 수 있는 간단한 센터정보 조회용.
export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  // 1. 세션 확인
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 2. 비즈니스 로직
  try {
    const params = await segmentData.params;
    const { id: centerId } = params;

    // 매니저가 관리하는 센터 목록 조회
    const center = await getCenterEquipmentsSimple(centerId);

    return NextResponse.json(center);
  } catch (error) {
    // 4. 에러 로깅
    await logApiError(request, error as Error, {});

    return NextResponse.json(
      { error: "센터 정보를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
