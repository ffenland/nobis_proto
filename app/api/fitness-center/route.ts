import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getFitnessCenters } from "@/app/lib/services/fitness-center.service";
import { logApiError } from "@/app/services/error/error-logging.service";

// GET: 운영 중인 피트니스 센터 목록 조회 (모든 role 접근 가능)
export async function GET(request: NextRequest) {
  // 1. 세션 확인
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 3. 비즈니스 로직
  try {
    // 모든 role이 접근 가능하므로 추가 권한 확인 없음
    const centers = await getFitnessCenters();
    return NextResponse.json(centers);
  } catch (error) {
    // 4. 에러 로깅
    await logApiError(request, error as Error, {
      errorCode: "FITNESS_CENTER_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getFitnessCenters",
      },
      tags: ["fitness-center", "list"],
    });

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "센터 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}
