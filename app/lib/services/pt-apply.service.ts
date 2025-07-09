// app/lib/services/pt-apply.service.ts
import prisma from "@/app/lib/prisma";
import { PtState, WeekDay } from "@prisma/client";
import { cache } from "react";
import { getEndTime } from "@/app/lib/utils/time.utils";

// ===== 스케줄링 관련 타입들 =====
export interface IScheduleSlot {
  date: Date;
  startTime: number;
  endTime: number;
}

export interface IDaySchedule {
  [dateKey: string]: number[]; // "2024-12-01": [900, 930, 1000] 형태
}

export interface ISchedulePattern {
  regular: boolean;
  count: number;
}

export interface IWeekTimeData {
  weekDay: WeekDay;
  startTime: number;
  endTime: number;
}

export interface IPtApplicationData {
  memberId: string;
  ptProductId: string;
  trainerId: string;
  startDate: Date;
  isRegular: boolean;
  chosenSchedule: IDaySchedule;
  fitnessCenterId: string; // 헬스장 ID 추가
  duration: number; // 수업 시간 (분 단위)
  message?: string;
}

// 요일 매핑
const weekdaysEnum = [
  { key: 0, enum: WeekDay.SUN },
  { key: 1, enum: WeekDay.MON },
  { key: 2, enum: WeekDay.TUE },
  { key: 3, enum: WeekDay.WED },
  { key: 4, enum: WeekDay.THU },
  { key: 5, enum: WeekDay.FRI },
  { key: 6, enum: WeekDay.SAT },
];

// ===== 헬스장 및 PT 프로그램 조회 =====

// 헬스장 목록 조회 (영업시간 정보 포함)
// 처음 PT 등록시 1단계에 사용됨 전체 center에 대한 정보 불러오기 !

export const getFitnessCentersService = cache(async () => {
  const centers = await prisma.fitnessCenter.findMany({
    select: {
      id: true,
      title: true,
      address: true,
      phone: true,
    },
    orderBy: {
      title: "asc",
    },
  });

  return centers;
});

// 센터를 선택한 후 이루어지는 로직
// 센터에 소속된 트레이너들이 수업할 수 있는 PTproduct만 불러오기
export const getPtProgramsByCenterService = cache(async (centerId: string) => {
  const ptPrograms = await prisma.ptProduct.findMany({
    where: {
      trainer: {
        some: {
          fitnessCenterId: centerId,
        },
      },
      onSale: true,
      closedAt: {
        gt: new Date(),
      },
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
          introduce: true,
          user: {
            select: {
              id: true,
              username: true,
              avatarMedia: {
                select: {
                  id: true,
                  publicUrl: true,
                  thumbnailUrl: true,
                  filename: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      title: "asc",
    },
  });

  return ptPrograms;
});

// PENDING PT 체크 함수
export const getPendingPtDetails = cache(async (memberId: string) => {
  const pendingPt = await prisma.pt.findFirst({
    where: {
      memberId,
      state: PtState.PENDING,
    },
    select: {
      id: true,
      createdAt: true,
      ptProduct: {
        select: {
          title: true,
          price: true,
          totalCount: true,
        },
      },
      trainer: {
        select: {
          user: {
            select: {
              username: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return pendingPt;
});

// 트레이너 3개월 스케줄 조회
export const getTrainerScheduleService = cache(
  async (trainerId: string, targetDate: Date) => {
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
        date: {
          gte: firstDateOfMonth,
          lt: threeMonthsLater,
        },
        ptRecord: {
          some: {
            pt: {
              trainerId,
              state: {
                in: [PtState.PENDING, PtState.CONFIRMED],
              },
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
        date: {
          gte: firstDateOfMonth,
          lt: threeMonthsLater,
        },
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
  }
);

// PT 신청 처리
export const applyPtService = async (data: IPtApplicationData) => {
  return await prisma.$transaction(async (tx) => {
    // 1. PT 생성 (Pt 모델의 실제 필드에 맞춤)
    const newPt = await tx.pt.create({
      data: {
        memberId: data.memberId,
        ptProductId: data.ptProductId,
        trainerId: data.trainerId,
        startDate: data.startDate,
        isRegular: data.isRegular,
        description: data.message || "",
        state: PtState.PENDING,
        trainerConfirmed: false,
      },
    });

    // 2. 스케줄 생성 - 연속된 시간대를 하나의 스케줄로 합치기
    const scheduleData = [];

    for (const [dateStr, times] of Object.entries(data.chosenSchedule)) {
      const date = new Date(dateStr);

      if (times.length > 0) {
        // 첫 번째 시간을 시작 시간으로, 마지막 시간에 30분을 더한 값을 종료 시간으로 설정
        const startTime = times[0];
        const endTime = getEndTime(times); // 마지막 슬롯에 30분 추가

        scheduleData.push({
          date,
          startTime,
          endTime,
        });
      }
    }

    // PT 스케줄 생성
    const createdSchedules = [];
    for (const schedule of scheduleData) {
      const ptSchedule = await tx.ptSchedule.create({
        data: schedule,
      });
      createdSchedules.push(ptSchedule);
    }

    // 3. PT 레코드 생성 (각 스케줄마다)
    for (const schedule of createdSchedules) {
      await tx.ptRecord.create({
        data: {
          ptId: newPt.id,
          ptScheduleId: schedule.id,
          fitnessCenterId: data.fitnessCenterId,
          memo: "",
        },
      });
    }

    // 4. WeekTime 생성 (정기 수업인 경우) - 연속된 시간대를 하나의 WeekTime으로 합치기
    if (data.isRegular) {
      const weekTimesData = [];

      for (const [dateStr, times] of Object.entries(data.chosenSchedule)) {
        const date = new Date(dateStr);
        const weekDay = weekdaysEnum[date.getDay()].enum;

        if (times.length > 0) {
          // 첫 번째 시간을 시작 시간으로, 마지막 시간에 30분을 더한 값을 종료 시간으로 설정
          const startTime = times[0];
          const endTime = getEndTime(times); // 마지막 슬롯에 30분 추가

          weekTimesData.push({
            weekDay,
            startTime,
            endTime,
            ptId: newPt.id,
          });
        }
      }

      await tx.weekTime.createMany({
        data: weekTimesData,
      });
    }

    return newPt;
  });
};

// ===== 유틸리티 함수들 =====

// ===== 타입 정의 =====
export type IFitnessCenters = Awaited<
  ReturnType<typeof getFitnessCentersService>
>;
export type IPtProgramsByCenter = Awaited<
  ReturnType<typeof getPtProgramsByCenterService>
>;
export type ITrainerSchedule = Awaited<
  ReturnType<typeof getTrainerScheduleService>
>;
export type IPtApplication = Awaited<ReturnType<typeof applyPtService>>;
export type IPendingPtDetails = Awaited<ReturnType<typeof getPendingPtDetails>>;

// API response type for pending PT check

export interface IPendingPt {
  id: string;
  ptTitle: string;
  trainerName: string;
  appliedDate: string;
  price: number;
  totalCount: number;
}
export interface IPendingPtCheck {
  hasPending: boolean;
  pendingPt?: {
    id: string;
    ptTitle: string;
    trainerName: string;
    appliedDate: string;
    price: number;
    totalCount: number;
  } | null;
}
