// app/api/trainer/working-hours/route.ts
import { NextRequest, NextResponse } from "next/server";
import { WeekDay } from "@prisma/client";
import { getSession } from "@/app/lib/session";
import {
  getTrainerWorkingHoursService,
  createTrainerWorkingHourService,
} from "@/app/lib/services/trainer.service";

// GET: 트레이너 근무시간 목록 조회
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

    const workingHours = await getTrainerWorkingHoursService(session.roleId);

    return NextResponse.json({
      success: true,
      data: workingHours,
    });

  } catch (error) {
    console.error("트레이너 근무시간 조회 오류:", error);

    return NextResponse.json(
      {
        error: "근무시간을 불러올 수 없습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}

// POST: 새 근무시간 추가
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
    const { dayOfWeek, startTime, endTime } = body;

    // 입력값 검증
    if (!dayOfWeek) {
      return NextResponse.json(
        { error: "요일을 선택해주세요." },
        { status: 400 }
      );
    }

    if (typeof startTime !== "number" || typeof endTime !== "number") {
      return NextResponse.json(
        { error: "시작 시간과 종료 시간은 숫자여야 합니다." },
        { status: 400 }
      );
    }

    // 요일 검증
    if (!Object.values(WeekDay).includes(dayOfWeek as WeekDay)) {
      return NextResponse.json(
        { error: "올바른 요일을 선택해주세요." },
        { status: 400 }
      );
    }

    // 시간 검증
    if (startTime < 0 || startTime > 23 || endTime < 1 || endTime > 24) {
      return NextResponse.json(
        { error: "올바른 시간을 입력해주세요. (시작: 0-23, 종료: 1-24)" },
        { status: 400 }
      );
    }

    if (startTime >= endTime) {
      return NextResponse.json(
        { error: "종료 시간은 시작 시간보다 늦어야 합니다." },
        { status: 400 }
      );
    }

    // 근무시간 생성
    const newWorkingHour = await createTrainerWorkingHourService(session.roleId, {
      dayOfWeek: dayOfWeek as WeekDay,
      startTime,
      endTime,
    });

    return NextResponse.json({
      success: true,
      message: "근무시간이 등록되었습니다.",
      data: newWorkingHour,
    });

  } catch (error) {
    console.error("근무시간 생성 오류:", error);

    // 비즈니스 로직 오류 (중복, 시간 검증 등)
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "근무시간 등록에 실패했습니다.",
        details: "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}