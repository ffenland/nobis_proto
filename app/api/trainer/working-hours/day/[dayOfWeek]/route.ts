// app/api/trainer/working-hours/day/[dayOfWeek]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { WeekDay } from "@prisma/client";
import { getSession } from "@/app/lib/session";
import { updateTrainerWorkingHoursForDayService } from "@/app/lib/services/trainer.service";

// PUT: 특정 요일의 근무시간 일괄 업데이트
export async function PUT(
  request: NextRequest,
  { params }: { params: { dayOfWeek: string } }
) {
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

    const dayOfWeek = params.dayOfWeek.toUpperCase();

    // 요일 검증
    if (!Object.values(WeekDay).includes(dayOfWeek as WeekDay)) {
      return NextResponse.json(
        { error: "올바른 요일을 선택해주세요." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { workingHours } = body;

    if (!Array.isArray(workingHours)) {
      return NextResponse.json(
        { error: "근무시간 목록이 필요합니다." },
        { status: 400 }
      );
    }

    // 각 근무시간 유효성 검사
    for (const hour of workingHours) {
      if (typeof hour.startTime !== "number" || typeof hour.endTime !== "number") {
        return NextResponse.json(
          { error: "시작 시간과 종료 시간은 숫자여야 합니다." },
          { status: 400 }
        );
      }

      if (hour.startTime < 0 || hour.startTime > 23 || hour.endTime < 1 || hour.endTime > 24) {
        return NextResponse.json(
          { error: "올바른 시간을 입력해주세요. (시작: 0-23, 종료: 1-24)" },
          { status: 400 }
        );
      }

      if (hour.startTime >= hour.endTime) {
        return NextResponse.json(
          { error: "종료 시간은 시작 시간보다 늦어야 합니다." },
          { status: 400 }
        );
      }
    }

    // 근무시간 일괄 업데이트
    const updatedWorkingHours = await updateTrainerWorkingHoursForDayService(
      session.roleId,
      dayOfWeek as WeekDay,
      workingHours
    );

    return NextResponse.json({
      success: true,
      message: `${dayOfWeek} 근무시간이 업데이트되었습니다.`,
      data: updatedWorkingHours,
    });

  } catch (error) {
    console.error("근무시간 업데이트 오류:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "근무시간 업데이트에 실패했습니다.",
        details: "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}