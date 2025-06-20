// app/api/member/pt-application/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import prisma from "@/app/lib/prisma";
import {
  ptError,
  responseError,
  scheduleError,
  serverError,
  weekDayNumberStringMap,
  weekdaysEnum,
} from "@/app/lib/constants";
import {
  convertRegularChosenScheduleToDate,
  convertTempChosenScheduleToDate,
  createTrainerPossibleSchedules,
  createWeekScheduleFromChosenSchedule,
  DaySchedule,
  ISchedule,
} from "@/app/lib/schedule";
import { Prisma, WeekDay } from "@prisma/client";

interface IPtApplicationRequest {
  ptProductId: string;
  trainerId: string;
  chosenSchedule: DaySchedule;
  pattern: {
    regular: boolean;
    howmany: number;
  };
  totalCount: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.roleId) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }
    if (session.role !== "MEMBER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body: IPtApplicationRequest = await request.json();
    const { ptProductId, trainerId, chosenSchedule, pattern, totalCount } =
      body;

    // 필수 필드 검증
    if (!ptProductId || !trainerId || !chosenSchedule || !pattern) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 1. 선택된 스케줄을 ISchedule[] 형태로 변환
    let schedules: ISchedule[] = [];
    if (pattern.regular) {
      // 정기 스케줄인 경우
      const regularSchedules = convertRegularChosenScheduleToDate({
        chosenSchedule,
        totalCount,
      });
      if (!regularSchedules) {
        return NextResponse.json(
          { error: "스케줄이 선택되지 않았습니다." },
          { status: 400 }
        );
      }
      schedules = regularSchedules;
    } else {
      // 수시 스케줄인 경우
      const tempSchedules = convertTempChosenScheduleToDate({ chosenSchedule });
      if (!tempSchedules) {
        return NextResponse.json(
          { error: "스케줄이 선택되지 않았습니다." },
          { status: 400 }
        );
      }
      schedules = tempSchedules;
    }

    // 2. 트레이너 스케줄 충돌 검사
    const trainerScheduleResult = await createTrainerPossibleSchedules({
      trainerId,
      schedules,
    });

    // 실패한 스케줄이 있으면 에러 반환
    if (trainerScheduleResult.fail.length > 0) {
      return NextResponse.json(
        {
          error: "선택한 시간에 트레이너가 이미 예약되어 있습니다.",
          failedSchedules: trainerScheduleResult.fail,
        },
        { status: 409 }
      );
    }

    const checkedSchedule = trainerScheduleResult.success;

    // 3. PT 생성 및 스케줄 등록
    const result = await createNewPtTransaction({
      ptProductId,
      trainerId,
      memberId: session.roleId,
      checkedSchedule,
      isRegular: pattern.regular,
      chosenSchedule,
    });

    if (!result.ok || !result.data) {
      return NextResponse.json(
        { error: result.message || "PT 신청 처리 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ptId: result.data.ptId,
      message: "PT 신청이 완료되었습니다.",
    });
  } catch (error) {
    console.error("PT Application 생성 실패:", error);
    return NextResponse.json(
      { error: "신청 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PT 생성 트랜잭션 함수 (기존 createNewPt 로직을 그대로 사용)
async function createNewPtTransaction({
  ptProductId,
  trainerId,
  memberId,
  checkedSchedule,
  isRegular,
  chosenSchedule,
}: {
  ptProductId: string;
  trainerId: string;
  memberId: string;
  checkedSchedule: ISchedule[];
  isRegular: boolean;
  chosenSchedule: DaySchedule;
}) {
  try {
    checkedSchedule.sort((a, b) => a.date.getTime() - b.date.getTime());
    const firstDate = checkedSchedule[0].date;

    const weekSchedule = createWeekScheduleFromChosenSchedule({
      chosenSchedule,
    });

    const transaction = await prisma.$transaction(async (trPrisma) => {
      // PT 프로덕트 검증
      const ptProduct = await trPrisma.ptProduct.findUnique({
        where: {
          id: ptProductId,
        },
        select: {
          id: true,
          onSale: true,
          price: true,
          totalCount: true,
          time: true,
        },
      });

      if (!ptProduct) {
        throw new Error(ptError.ptProduct.notFound.code);
      }

      if (!ptProduct.onSale) {
        throw new Error("현재 판매하지 않는 PT 프로그램입니다.");
      }

      // WeekTime 생성 또는 조회
      const weekTimeIds = await Promise.all(
        weekSchedule.map(async (schedule) => {
          const weekDay = weekDayNumberStringMap[schedule.day].eng
            .short as keyof typeof WeekDay;
          const weekTime = await trPrisma.weekTime.upsert({
            where: {
              weekDay_startTime_endTime: {
                weekDay,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
              },
            },
            create: {
              weekDay,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
            },
            update: {},
          });
          return weekTime.id;
        })
      );

      // PT 생성
      const newPt = await trPrisma.pt.create({
        data: {
          ptProductId: ptProduct.id,
          trainerId,
          memberId,
          startDate: firstDate,
          isRegular,
          weekTimes: {
            connect: weekTimeIds.map((id) => ({ id })),
          },
        },
        select: {
          id: true,
        },
      });

      // PT 스케줄 생성
      const ptScheduleIds = await Promise.all(
        checkedSchedule.map(async (schedule) => {
          const ptSchedule = await trPrisma.ptSchedule.upsert({
            where: {
              date_startTime_endTime: {
                date: schedule.date,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
              },
            },
            create: {
              date: schedule.date,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
            },
            update: {},
          });
          return ptSchedule.id;
        })
      );

      // PT 기록 생성 (모든 스케줄에 대해)
      await trPrisma.ptRecord.createMany({
        data: ptScheduleIds.map((id) => ({
          ptId: newPt.id,
          ptScheduleId: id,
        })),
      });

      return newPt.id;
    });

    return { ok: true, data: { ptId: transaction } };
  } catch (error) {
    console.error("PT 생성 트랜잭션 오류:", error);
    return {
      ok: false,
      code:
        error instanceof Error && error.message
          ? error.message
          : serverError.unknown.code,
      message:
        error instanceof Error && error.message
          ? error.message
          : "알 수 없는 오류",
    };
  }
}
