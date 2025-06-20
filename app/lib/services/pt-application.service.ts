// app/lib/services/pt-application.service.ts
import prisma from "@/app/lib/prisma";

// 센터 목록 조회
export const getCentersService = async () => {
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

// 센터별 PT 프로그램과 트레이너 조회
export const getPtProgramsByCenterService = async (centerId: string) => {
  const ptPrograms = await prisma.ptProduct.findMany({
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
  return ptPrograms;
};

// 트레이너 3개월 스케줄 조회
export const getTrainerScheduleService = async (
  trainerId: string,
  targetDate: Date
) => {
  const firstDateOfMonth = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    1
  );

  const threeMonthsLater = new Date(firstDateOfMonth);
  firstDateOfMonth.setHours(firstDateOfMonth.getHours() - 9); // UTC로 설정

  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
  threeMonthsLater.setHours(threeMonthsLater.getHours() - 9); // UTC로 설정

  // 1. 트레이너 기존 PT 스케줄
  const existingSchedules = await prisma.ptSchedule.findMany({
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

  // 2. 트레이너 OFF (특정 날짜)
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
    select: {
      weekDay: true,
      startTime: true,
      endTime: true,
    },
  });

  return {
    existingSchedules,
    trainerOffs,
    repeatOffs,
    dateRange: {
      start: firstDateOfMonth,
      end: threeMonthsLater,
    },
  };
};

// PT 신청 생성
export const createPtApplicationService = async (data: {
  memberId: string;
  ptProductId: string;
  trainerId: string;
  isRegular: boolean;
  startDate: Date;
  schedules: Array<{
    date: Date;
    startTime: number;
    endTime: number;
  }>;
  weekTimes?: Array<{
    weekDay: string;
    startTime: number;
    endTime: number;
  }>;
}) => {
  const result = await prisma.$transaction(async (tx) => {
    // PT 생성
    const pt = await tx.pt.create({
      data: {
        ptProductId: data.ptProductId,
        trainerId: data.trainerId,
        memberId: data.memberId,
        startDate: data.startDate,
        isRegular: data.isRegular,
        trainerConfirmed: false,
        isActive: false,
      },
    });

    // 주간 스케줄 생성 (정기 수업인 경우)
    if (data.isRegular && data.weekTimes) {
      const weekTimeIds = await Promise.all(
        data.weekTimes.map(async (weekTime) => {
          const wt = await tx.weekTime.upsert({
            where: {
              weekDay_startTime_endTime: {
                weekDay: weekTime.weekDay as any,
                startTime: weekTime.startTime,
                endTime: weekTime.endTime,
              },
            },
            create: {
              weekDay: weekTime.weekDay as any,
              startTime: weekTime.startTime,
              endTime: weekTime.endTime,
              ptId: pt.id,
            },
            update: {},
          });
          return wt.id;
        })
      );

      await tx.pt.update({
        where: { id: pt.id },
        data: {
          weekTimes: {
            connect: weekTimeIds.map((id) => ({ id })),
          },
        },
      });
    }

    // PT 스케줄 및 기록 생성
    const ptScheduleIds = await Promise.all(
      data.schedules.map(async (schedule) => {
        const ptSchedule = await tx.ptSchedule.upsert({
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

    // PT 기록 생성
    await tx.ptRecord.createMany({
      data: ptScheduleIds.map((scheduleId) => ({
        ptId: pt.id,
        ptScheduleId: scheduleId,
      })),
    });

    return pt;
  });

  return result;
};

// 타입 추론
export type ICentersForMember = Awaited<ReturnType<typeof getCentersService>>;
export type IPtAndTrainer = Awaited<
  ReturnType<typeof getPtProgramsByCenterService>
>;
export type ITrainer = IPtAndTrainer[number]["trainer"][number];
export type ITrainerSchedule = Awaited<
  ReturnType<typeof getTrainerScheduleService>
>;
