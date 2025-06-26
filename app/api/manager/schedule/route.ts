// app/api/manager/schedule/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import { getTrainerScheduleViewService } from "@/app/lib/services/schedule-view.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "MANAGER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const trainerId = searchParams.get("trainerId");
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    // 파라미터 검증
    if (!trainerId) {
      return NextResponse.json(
        { error: "trainerId 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    if (!startDateStr) {
      return NextResponse.json(
        { error: "startDate 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    if (!endDateStr) {
      return NextResponse.json(
        { error: "endDate 파라미터가 필요합니다." },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "올바른 날짜 형식이 아닙니다." },
        { status: 400 }
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "시작 날짜는 종료 날짜보다 이전이어야 합니다." },
        { status: 400 }
      );
    }

    // 지정된 트레이너의 스케줄 조회 (권한 체크 없음)
    const scheduleData = await getTrainerScheduleViewService(
      trainerId,
      startDate,
      endDate
    );

    return NextResponse.json(scheduleData);
  } catch (error) {
    console.error("매니저 스케줄 조회 실패:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
