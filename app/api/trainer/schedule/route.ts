// app/api/trainer/schedule/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getTrainerScheduleService } from "@/app/lib/services/trainer-schedule.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"));
    }
    if (session.role !== "TRAINER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    // 파라미터가 있는 경우 검증
    if (startDateStr || endDateStr) {
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

      startDate = new Date(startDateStr);
      endDate = new Date(endDateStr);

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
    }

    // 새로운 서비스 사용 - 파라미터 없으면 기본값(오늘부터 12주) 사용
    const scheduleData = await getTrainerScheduleService(
      session.roleId,
      startDate,
      endDate
    );

    return NextResponse.json(scheduleData);
  } catch (error) {
    console.error("트레이너 스케줄 조회 실패:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
