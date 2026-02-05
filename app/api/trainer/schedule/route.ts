// app/api/trainer/schedule/route.ts
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getTrainerSchedule } from "@/app/services/trainer/schedule.service";
import { logApiError } from "@/app/services/error/error-logging.service";

export async function GET(request: NextRequest) {
  // 세션 처리를 먼저 수행
  const sessionOrResponse = await getSessionOrReturn401();

  // 401 응답인 경우 바로 반환
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 트레이너 권한 확인
  if (sessionOrResponse.role !== "TRAINER") {
    return NextResponse.json(
      { error: "트레이너 권한이 필요합니다." },
      { status: 403 }
    );
  }

  try {
    // URL 파라미터에서 target 가져오기
    const { searchParams } = new URL(request.url);
    const targetMonth = searchParams.get("target") || undefined;

    // 정상 세션인 경우 서비스 함수 호출
    // session.roleId는 Trainer 모델의 id
    const schedule = await getTrainerSchedule(
      sessionOrResponse.roleId,
      targetMonth
    );

    return NextResponse.json(schedule);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_TRAINER_SCHEDULE_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getTrainerSchedule",
      },
      tags: ["api", "trainer", "schedule"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}