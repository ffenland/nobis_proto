"use server";

import {
  ptError,
  responseError,
  scheduleError,
  serverError,
  weekDayNumberStringMap,
  weekdaysEnum,
} from "@/app/lib/constants";
import prisma from "@/app/lib/prisma";
import {
  convertRegularChosenScheduleToDate,
  convertTempChosenScheduleToDate,
  createTrainerPossibleSchedules,
  createWeekScheduleFromChosenSchedule,
  DaySchedule,
  getStartTimePoints,
  ISchedule,
} from "@/app/lib/schedule";
import { getSession } from "@/app/lib/session";
import { Prisma, WeekDay } from "@prisma/client";

export type ICentersForMember = Prisma.PromiseReturnType<typeof getCenters>;

export const getCenters = async () => {
  const centers = await prisma.fitnessCenter.findMany({
    select: {
      id: true,
      title: true,
      address: true,
      description: true,
      phone: true,
    },
  });
  return centers;
};

export type IPtAndTrainer = Prisma.PromiseReturnType<
  typeof getPtProductsOfTrainerByCenter
>;

export type ITrainer = IPtAndTrainer[number]["trainer"][number];
export const getPtProductsOfTrainerByCenter = async (centerId: string) => {
  const trainersAndPtProducts = await prisma.ptProduct.findMany({
    where: {
      trainer: {
        some: {
          fitnessCenterId: centerId,
        },
      },
      onSale: true,
    },
    select: {
      id: true,
      title: true,
      description: true,
      totalCount: true,
      time: true,
      price: true,
      trainer: {
        where: {
          fitnessCenterId: centerId,
        },
        select: {
          id: true,
          avatar: true,
          introduce: true,
          user: {
            select: {
              username: true,
            },
          },
        },
      },
    },
  });
  return trainersAndPtProducts;
};

export const get3MonthTrainerSchedule = async ({
  trainerId,
  targetDate,
}: {
  trainerId: string;
  targetDate: Date;
}) => {
  // 일반적으로 targetDate는 현재 날짜로 설정되지만,
  // 테스트를 위해 특정 날짜로 설정할 수 있습니다.
  // targetDate를 해당 월의 첫째 날로 설정
  const firstDateOfMonth = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    1
  );

  const threeMonthsLater = new Date(firstDateOfMonth);
  firstDateOfMonth.setHours(firstDateOfMonth.getHours() - 9); // UTC로 설정

  // 3개월 후의 첫째 날 계산
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
  threeMonthsLater.setHours(threeMonthsLater.getHours() - 9); // UTC로 설정

  const threeMonthTrainerSchedule = await prisma.ptSchedule.findMany({
    where: {
      ptRecord: {
        some: {
          pt: {
            trainerId,
          },
          ptSchedule: {
            date: { gte: firstDateOfMonth, lt: threeMonthsLater },
          },
        },
      },
    },
    select: {
      date: true,
      startTime: true,
      endTime: true,
    },
  });

  // 2. 트레이너 OFF(쉬는 시간)
  const trainerOffs = await prisma.trainerOff.findMany({
    where: {
      trainerId,
      date: { gte: firstDateOfMonth, lt: threeMonthsLater },
    },
    select: {
      date: true,
      startTime: true,
      endTime: true,
    },
  });
  // 3. 트레이너 OFF (반복)
  const repeatOffs = await prisma.trainerOff.findMany({
    where: {
      trainerId,
      weekDay: { not: null },
    },
    select: { weekDay: true, startTime: true, endTime: true },
  });

  const schedule: DaySchedule = {};

  threeMonthTrainerSchedule.forEach((item) => {
    const dateKey = item.date.toISOString().split("T")[0]; // "YYYY-MM-DD"
    if (!schedule[dateKey]) {
      schedule[dateKey] = [];
    }
    const startTimes = getStartTimePoints(item.startTime, item.endTime);

    schedule[dateKey] = [...schedule[dateKey], ...startTimes];
  });
  // 트레이너 OFF 반영
  trainerOffs.forEach((item) => {
    if (!item.date) return;
    const dateKey = item.date.toISOString().split("T")[0];
    if (!schedule[dateKey]) schedule[dateKey] = [];
    const startTimes = getStartTimePoints(item.startTime, item.endTime);
    schedule[dateKey] = [...schedule[dateKey], ...startTimes];
  });

  // 트레이너 OFF 반영 (반복)
  for (
    let d = new Date(firstDateOfMonth);
    d < threeMonthsLater;
    d.setDate(d.getDate() + 1)
  ) {
    const dateKey = d.toISOString().split("T")[0];
    const weekDay = d.getDay(); // 0:일~6:토, 필요시 enum 매핑
    // number → enum 변환
    const weekDayEnum = weekdaysEnum.find((w) => w.key === weekDay)?.enum;
    repeatOffs.forEach((off) => {
      if (off.weekDay && off.weekDay === weekDayEnum) {
        if (!schedule[dateKey]) schedule[dateKey] = [];
        const startTimes = getStartTimePoints(off.startTime, off.endTime);
        schedule[dateKey] = [...schedule[dateKey], ...startTimes];
      }
    });
  }
  return schedule;
};

export interface ICheckedSchedule {
  success: ISchedule[];
  fail: ISchedule[];
}

export type TrainerScheduleCheckResult =
  | {
      ok: true;
      data: ICheckedSchedule;
    }
  | { ok: false; code: string };

export const trainerScheduleCheck = async ({
  trainerId,
  chosenSchedule,
  pattern,
  totalCount,
}: {
  trainerId: string;
  chosenSchedule: DaySchedule;
  pattern: {
    regular: boolean;
    howmany: number;
  };
  totalCount: number;
}): Promise<TrainerScheduleCheckResult> => {
  const session = await getSession();
  if (!session)
    return { ok: false, code: responseError.sesseion.noSession.code };
  if (session.role !== "MEMBER")
    return { ok: false, code: responseError.sesseion.roleMismatch.code };

  try {
    let schedules: ISchedule[] = [];
    if (pattern.regular) {
      // 정규 스케줄인 경우
      const regularSchedules = convertRegularChosenScheduleToDate({
        chosenSchedule,
        totalCount,
      });
      if (!regularSchedules) {
        return { ok: false, code: scheduleError.chosenSchedule.notChosen.code };
      } else {
        schedules = regularSchedules;
      }
    } else {
      // 비정규 스케줄인 경우
      const tempSchedules = convertTempChosenScheduleToDate({ chosenSchedule });
      if (!tempSchedules) {
        return { ok: false, code: scheduleError.chosenSchedule.notChosen.code };
      } else {
        schedules = tempSchedules;
      }
    }

    const trainerScheduleResult = await createTrainerPossibleSchedules({
      trainerId,
      schedules,
    });
    return { ok: true, data: trainerScheduleResult };
  } catch (error) {
    console.log("error", error);
    return { ok: false, code: `${serverError.unknown.code} - ${error}` };
  }
};

type IcreateNewPtSuccess = {
  ok: true;
  data: {
    ptId: string;
  };
};
type IcreateNewPtFail = {
  ok: false;
  code: string;
  message?: string;
};
export type ICreateNewPtResult = IcreateNewPtSuccess | IcreateNewPtFail;

export const createNewPt = async ({
  ptProductId,
  trainerId,
  checkedSchedule,
  isRegular,
  chosenSchedule,
}: {
  ptProductId: string;
  trainerId: string;
  checkedSchedule: ISchedule[];
  isRegular: boolean;
  chosenSchedule: DaySchedule;
}): Promise<ICreateNewPtResult> => {
  try {
    const session = await getSession();
    if (!session)
      return { ok: false, code: responseError.sesseion.noSession.code };
    if (session.role !== "MEMBER")
      return { ok: false, code: responseError.sesseion.roleMismatch.code };
    checkedSchedule.sort((a, b) => a.date.getTime() - b.date.getTime());
    const firstDate = checkedSchedule[0].date;
    const memberId = session.roleId;
    const weekSchedule = createWeekScheduleFromChosenSchedule({
      chosenSchedule,
    });
    const transaction = await prisma.$transaction(async (trPrisma) => {
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
      // create or get weekTime data
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
      // make or get ptSchedule
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
      // 모든 스케줄에 대해 ptRecord 생성
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
    console.error("오류 발생:", error);
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
};
