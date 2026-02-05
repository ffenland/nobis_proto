// app/api/trainer/lesson/schedule-check/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import {
  checkTrainerLessonConflict,
  CheckTrainerLessonConflictResult,
} from "@/app/services/trainer/lesson.service";
import { logApiError } from "@/app/services/error/error-logging.service";

export async function GET(request: NextRequest) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "TRAINER") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {

    // URL에서 쿼리 파라미터 추출
    const { searchParams } = new URL(request.url);
    const scheduledAt = searchParams.get("scheduledAt");
    const endAt = searchParams.get("endAt");

    // 필수 파라미터 검증
    if (!scheduledAt || !endAt) {
      return NextResponse.json(
        { error: "scheduledAt과 endAt 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    // 날짜 파싱
    const scheduledDate = new Date(scheduledAt);
    const endDate = new Date(endAt);

    // 유효한 날짜인지 확인
    if (isNaN(scheduledDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "유효하지 않은 날짜 형식입니다." },
        { status: 400 }
      );
    }

    // 시작 시간이 종료 시간보다 늦은지 확인
    if (scheduledDate >= endDate) {
      return NextResponse.json(
        { error: "시작 시간이 종료 시간보다 늦거나 같을 수 없습니다." },
        { status: 400 }
      );
    }

    // 스케줄 충돌 체크
    const conflicts: CheckTrainerLessonConflictResult =
      await checkTrainerLessonConflict(
        sessionOrResponse.roleId,
        scheduledDate,
        endDate
      );

    return NextResponse.json(conflicts);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_TRAINER_LESSON_SCHEDULE_CHECK_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "checkTrainerLessonConflict",
      },
      tags: ["api", "trainer", "lesson", "schedule"],
    });

    return NextResponse.json(
      { error: "스케줄 체크 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
