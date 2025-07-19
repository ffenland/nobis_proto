// app/api/trainer/schedule/off/route.ts
import { NextRequest, NextResponse } from "next/server";
import { WeekDay } from "@prisma/client";
import { getSession } from "@/app/lib/session";
import {
  getTrainerOffSchedulesService,
  createTrainerOffScheduleService,
} from "@/app/lib/services/trainer.service";

// GET: 트레이너 오프 일정 목록 조회
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    if (session.role !== "TRAINER" || !session.roleId) {
      return NextResponse.json(
        { error: "트레이너만 접근할 수 있습니다." },
        { status: 403 }
      );
    }

    const offSchedules = await getTrainerOffSchedulesService(session.roleId);

    return NextResponse.json({
      success: true,
      data: offSchedules,
    });

  } catch (error) {
    console.error("트레이너 오프 일정 조회 오류:", error);

    return NextResponse.json(
      {
        error: "오프 일정을 불러올 수 없습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}

// POST: 새 오프 일정 추가
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    if (session.role !== "TRAINER" || !session.roleId) {
      return NextResponse.json(
        { error: "트레이너만 접근할 수 있습니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { startDate, endDate, dateType, startTime, endTime } = body;

    // 입력값 검증
    if (typeof startTime !== "number" || typeof endTime !== "number") {
      return NextResponse.json(
        { error: "시작 시간과 종료 시간은 숫자여야 합니다." },
        { status: 400 }
      );
    }

    if (!startDate) {
      return NextResponse.json(
        { error: "특정 날짜를 선택해야 합니다." },
        { status: 400 }
      );
    }

    // 날짜 검증 (특정 날짜인 경우)
    if (startDate) {
      const startDateObj = new Date(startDate);
      if (isNaN(startDateObj.getTime())) {
        return NextResponse.json(
          { error: "올바른 시작 날짜 형식을 입력해주세요." },
          { status: 400 }
        );
      }

      // 과거 날짜 검증
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDateObj < today) {
        return NextResponse.json(
          { error: "과거 날짜에는 오프 일정을 등록할 수 없습니다." },
          { status: 400 }
        );
      }

      // 범위 선택인 경우 종료 날짜 검증
      if (dateType === "range" && endDate) {
        const endDateObj = new Date(endDate);
        if (isNaN(endDateObj.getTime())) {
          return NextResponse.json(
            { error: "올바른 종료 날짜 형식을 입력해주세요." },
            { status: 400 }
          );
        }

        if (startDateObj > endDateObj) {
          return NextResponse.json(
            { error: "종료 날짜는 시작 날짜보다 늦어야 합니다." },
            { status: 400 }
          );
        }

        // 범위가 너무 긴 경우 제한 (예: 최대 30일)
        const daysDiff = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff > 30) {
          return NextResponse.json(
            { error: "날짜 범위는 최대 30일까지 선택할 수 있습니다." },
            { status: 400 }
          );
        }
      }
    }

    // 오프 일정 생성
    const newSchedule = await createTrainerOffScheduleService(session.roleId, {
      startDate,
      endDate,
      dateType,
      startTime,
      endTime,
    });

    return NextResponse.json({
      success: true,
      message: "오프 일정이 등록되었습니다.",
      data: newSchedule,
    });

  } catch (error) {
    console.error("오프 일정 생성 오류:", error);

    // 비즈니스 로직 오류 (중복, 시간 검증 등)
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "오프 일정 등록에 실패했습니다.",
        details: "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}