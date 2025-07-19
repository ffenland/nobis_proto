import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import prisma from "@/app/lib/prisma";
import { WeekDay } from "@prisma/client";
import { z } from "zod";

const WorkingHourUpdateSchema = z.object({
  workingHours: z.array(
    z.object({
      dayOfWeek: z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]),
      openTime: z.number().min(0).max(2359),
      closeTime: z.number().min(0).max(2359),
    })
  ),
});

type Params = Promise<{ trainerId: string }>;

// PUT: 트레이너 근무시간 일괄 업데이트 (매니저용)
export async function PUT(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const params = await segmentData.params;
    const trainerId = params.trainerId;

    const session = await getSession();
    if (!session || session.role !== "MANAGER") {
      return NextResponse.json(
        { error: "매니저 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { workingHours } = WorkingHourUpdateSchema.parse(body);

    // 트레이너 존재 여부 확인
    const trainer = await prisma.trainer.findUnique({
      where: { id: trainerId },
      select: { id: true },
    });

    if (!trainer) {
      return NextResponse.json(
        { error: "트레이너를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 새로운 근무시간들을 생성 또는 찾기
      const workingHourPromises = workingHours.map(async (wh) => {
        // 동일한 근무시간이 이미 존재하는지 확인
        let existingWorkingHour = await tx.workingHour.findUnique({
          where: {
            dayOfWeek_openTime_closeTime: {
              dayOfWeek: wh.dayOfWeek as WeekDay,
              openTime: wh.openTime,
              closeTime: wh.closeTime,
            },
          },
          select: {
            id: true,
            dayOfWeek: true,
            openTime: true,
            closeTime: true,
          },
        });

        // 없으면 새로 생성
        if (!existingWorkingHour) {
          existingWorkingHour = await tx.workingHour.create({
            data: {
              dayOfWeek: wh.dayOfWeek as WeekDay,
              openTime: wh.openTime,
              closeTime: wh.closeTime,
            },
            select: {
              id: true,
              dayOfWeek: true,
              openTime: true,
              closeTime: true,
            },
          });
        }

        return existingWorkingHour;
      });

      const newWorkingHours = await Promise.all(workingHourPromises);

      // 트레이너의 근무시간을 새로운 것들로 교체
      await tx.trainer.update({
        where: { id: trainerId },
        data: {
          workingHours: {
            set: newWorkingHours.map((wh) => ({ id: wh.id })),
          },
        },
      });

      return newWorkingHours;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "트레이너 근무시간이 업데이트되었습니다.",
    });
  } catch (error) {
    console.error("트레이너 근무시간 업데이트 오류:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "잘못된 요청 데이터입니다.", details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "근무시간을 업데이트할 수 없습니다." },
      { status: 500 }
    );
  }
}