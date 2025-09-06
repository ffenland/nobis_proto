// app/api/trainer/lesson/schedule-check/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { checkTrainerScheduleConflict } from "@/app/services/trainer/lesson.service";

export async function GET(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getSession();
    if (!session || session.role !== "TRAINER") {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

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
    const conflicts = await checkTrainerScheduleConflict(
      session.roleId, // trainerId
      scheduledDate,
      endDate
    );

    return NextResponse.json({
      conflicts,
      isAvailable: conflicts.length === 0,
      message: conflicts.length === 0 
        ? "선택하신 시간에 스케줄이 가능합니다."
        : `${conflicts.length}개의 충돌하는 일정이 있습니다.`
    });
  } catch (error) {
    console.error("스케줄 체크 실패:", error);
    return NextResponse.json(
      { error: "스케줄 체크 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}