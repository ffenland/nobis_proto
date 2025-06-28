// app/lib/services/pt-apply.service.ts
import prisma from "@/app/lib/prisma";
import { PtState, WeekDay } from "@prisma/client";
import { cache } from "react";

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
  totalCount: number;
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

// 헬스장 목록 조회
export const getFitnessCentersService = cache(async () => {
  const centers = await prisma.fitnessCenter.findMany({
    select: {
      id: true,
      title: true,
      address: true,
      phone: true,
      description: true,
    },
    orderBy: {
      title: "asc",
    },
  });

  return centers;
});

// 센터별 PT 프로그램과 트레이너 조회
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
                select: {},
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return ptPrograms;
});

// ===== 스케줄링 유틸리티 함수들 =====

// 정기 스케줄을 IScheduleSlot 배열로 변환
export const convertRegularScheduleToSlots = (
  chosenSchedule: IDaySchedule,
  totalCount: number
): IScheduleSlot[] => {
  const slots: IScheduleSlot[] = [];
  const scheduleEntries = Object.entries(chosenSchedule);

  if (scheduleEntries.length === 0) return slots;

  // 첫 번째 날짜를 기준으로 시작
  const firstDateStr = scheduleEntries[0][0];
  const firstDate = new Date(firstDateStr);

  let currentWeek = 0;
  let sessionCount = 0;

  while (sessionCount < totalCount) {
    for (const [dateStr, times] of scheduleEntries) {
      if (sessionCount >= totalCount) break;

      const baseDate = new Date(dateStr);
      // 현재 주차만큼 날짜를 앞으로 이동
      const targetDate = new Date(baseDate);
      targetDate.setDate(targetDate.getDate() + currentWeek * 7);

      for (const time of times) {
        if (sessionCount >= totalCount) break;

        const startTime = time;
        const endTime = time + 100; // 1시간 후 (예: 900 -> 1000)

        slots.push({
          date: new Date(targetDate),
          startTime,
          endTime,
        });

        sessionCount++;
      }
    }
    currentWeek++;
  }

  return slots;
};

// 비정기 스케줄을 IScheduleSlot 배열로 변환
export const convertTempScheduleToSlots = (
  chosenSchedule: IDaySchedule
): IScheduleSlot[] => {
  const slots: IScheduleSlot[] = [];

  for (const [dateStr, times] of Object.entries(chosenSchedule)) {
    const date = new Date(dateStr);

    for (const time of times) {
      const startTime = time;
      const endTime = time + 100; // 1시간 후

      slots.push({
        date,
        startTime,
        endTime,
      });
    }
  }

  return slots.sort((a, b) => a.date.getTime() - b.date.getTime());
};

// 선택된 스케줄에서 WeekTime 데이터 생성
export const generateWeekTimeFromSchedule = (
  chosenSchedule: IDaySchedule
): IWeekTimeData[] => {
  const weekTimeData: IWeekTimeData[] = [];

  for (const [dateStr, times] of Object.entries(chosenSchedule)) {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ...
    const weekDay = weekdaysEnum[dayOfWeek].enum;

    for (const time of times) {
      weekTimeData.push({
        weekDay,
        startTime: time,
        endTime: time + 100,
      });
    }
  }

  return weekTimeData;
};

// ===== 스케줄 충돌 검사 =====

// member의 pending PT 상세 정보 조회
export const getPendingPtDetails = async (memberId: string) => {
  const existingPendingPt = await prisma.pt.findFirst({
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
          user: { select: { username: true } },
        },
      },
    },
  });

  return existingPendingPt; // null이면 pending PT 없음, 객체면 있음
};

// member의 pending PT 존재 여부 확인 (간단한 체크용)
export const isPendingPtExists = async (memberId: string): Promise<boolean> => {
  const pendingPt = await getPendingPtDetails(memberId);
  return !!pendingPt;
};

// 트레이너 스케줄 충돌 검사
export const checkTrainerScheduleConflict = async (
  trainerId: string,
  requestedSchedules: IScheduleSlot[]
) => {
  // 요청된 스케줄 날짜 범위
  const dates = requestedSchedules.map((s) => s.date);
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

  // 1. 기존 PT 스케줄 조회
  const existingSchedules = await prisma.ptSchedule.findMany({
    where: {
      date: {
        gte: minDate,
        lte: maxDate,
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

  // 2. 트레이너 OFF 일정 조회
  const trainerOffs = await prisma.trainerOff.findMany({
    where: {
      trainerId,
      OR: [
        // 특정 날짜 OFF
        {
          date: {
            gte: minDate,
            lte: maxDate,
          },
        },
        // 반복 OFF (요일별)
        {
          weekDay: {
            not: null,
          },
        },
      ],
    },
    select: {
      date: true,
      weekDay: true,
      startTime: true,
      endTime: true,
    },
  });

  // 3. 충돌 검사
  const conflicts: string[] = [];

  for (const requestedSlot of requestedSchedules) {
    const conflictingSessions = existingSchedules.filter(
      (existing) =>
        isSameDay(existing.date, requestedSlot.date) &&
        isTimeOverlapping(
          existing.startTime,
          existing.endTime,
          requestedSlot.startTime,
          requestedSlot.endTime
        )
    );

    const conflictingOffs = trainerOffs.filter((off) => {
      // 특정 날짜 OFF 체크
      if (off.date && isSameDay(off.date, requestedSlot.date)) {
        return isTimeOverlapping(
          off.startTime || 0,
          off.endTime || 2400,
          requestedSlot.startTime,
          requestedSlot.endTime
        );
      }

      // 반복 OFF (요일별) 체크
      if (off.weekDay) {
        const requestedDayOfWeek = requestedSlot.date.getDay();
        const offDayOfWeek = weekdaysEnum.find(
          (w) => w.enum === off.weekDay
        )?.key;

        if (requestedDayOfWeek === offDayOfWeek) {
          return isTimeOverlapping(
            off.startTime || 0,
            off.endTime || 2400,
            requestedSlot.startTime,
            requestedSlot.endTime
          );
        }
      }

      return false;
    });

    if (conflictingSessions.length > 0 || conflictingOffs.length > 0) {
      const dateStr = requestedSlot.date.toLocaleDateString("ko-KR");
      const timeStr = `${formatTime(requestedSlot.startTime)}-${formatTime(
        requestedSlot.endTime
      )}`;
      conflicts.push(`${dateStr} ${timeStr}`);
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflictDetails: conflicts.join(", "),
    conflictCount: conflicts.length,
  };
};

// ===== PT 신청 메인 서비스 =====

// PT 신청 처리
export const applyPtService = async (data: IPtApplicationData) => {
  const {
    memberId,
    ptProductId,
    trainerId,
    startDate,
    isRegular,
    chosenSchedule,
    totalCount,
    message,
  } = data;

  // 1. PT 프로그램 정보 확인
  const ptProduct = await prisma.ptProduct.findUnique({
    where: { id: ptProductId },
    select: {
      id: true,
      totalCount: true,
      title: true,
      onSale: true,
      time: true,
    },
  });

  if (!ptProduct) {
    throw new Error("PT 프로그램을 찾을 수 없습니다.");
  }

  if (!ptProduct.onSale) {
    throw new Error("현재 판매하지 않는 PT 프로그램입니다.");
  }

  // 2. 트레이너 확인
  const trainer = await prisma.trainer.findUnique({
    where: { id: trainerId },
    select: { id: true },
  });

  if (!trainer) {
    throw new Error("트레이너를 찾을 수 없습니다.");
  }

  // 3. 선택된 스케줄을 IScheduleSlot 배열로 변환
  let schedules: IScheduleSlot[] = [];

  if (isRegular) {
    schedules = convertRegularScheduleToSlots(chosenSchedule, totalCount);
  } else {
    schedules = convertTempScheduleToSlots(chosenSchedule);
  }

  if (schedules.length === 0) {
    throw new Error("선택된 스케줄이 없습니다.");
  }

  // 4. 트레이너 스케줄 충돌 검사
  const conflictResult = await checkTrainerScheduleConflict(
    trainerId,
    schedules
  );

  if (conflictResult.hasConflict) {
    throw new Error(
      `선택한 시간에 트레이너가 이미 예약되어 있습니다: ${conflictResult.conflictDetails}`
    );
  }

  // 5. WeekTime 데이터 생성 (정기 수업인 경우)
  let weekTimeData: IWeekTimeData[] = [];
  if (isRegular) {
    weekTimeData = generateWeekTimeFromSchedule(chosenSchedule);
  }

  // 6. 트랜잭션으로 PT 생성
  const result = await prisma.$transaction(async (tx) => {
    // PT 생성
    const newPt = await tx.pt.create({
      data: {
        memberId,
        ptProductId,
        trainerId,
        startDate,
        state: PtState.PENDING,
        trainerConfirmed: false,
        description: message || "",
        isRegular,
      },
      select: {
        id: true,
        state: true,
        isRegular: true,
        ptProduct: {
          select: {
            title: true,
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
    });

    // WeekTime 생성 (정기 수업인 경우)
    if (isRegular && weekTimeData.length > 0) {
      await Promise.all(
        weekTimeData.map(async (weekTime) => {
          return tx.weekTime.upsert({
            where: {
              weekDay_startTime_endTime: {
                weekDay: weekTime.weekDay,
                startTime: weekTime.startTime,
                endTime: weekTime.endTime,
              },
            },
            create: {
              weekDay: weekTime.weekDay,
              startTime: weekTime.startTime,
              endTime: weekTime.endTime,
              ptId: newPt.id,
            },
            update: {},
          });
        })
      );
    }

    // PT 스케줄 생성
    const ptScheduleIds = await Promise.all(
      schedules.map(async (schedule) => {
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
        ptId: newPt.id,
        ptScheduleId: scheduleId,
        attended: "RESERVED",
      })),
    });

    return newPt;
  });

  return result;
};

// 트레이너 3개월 스케줄 조회 (신청 시 충돌 확인용)
export const getTrainerScheduleService = async (
  trainerId: string,
  targetDate: Date = new Date()
) => {
  const firstDateOfMonth = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    1
  );

  const threeMonthsLater = new Date(firstDateOfMonth);
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

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
};

// ===== 유틸리티 함수들 =====

// 같은 날인지 확인
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// 시간 겹침 확인
const isTimeOverlapping = (
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean => {
  return start1 < end2 && start2 < end1;
};

// 시간 포맷팅 (900 -> "09:00")
const formatTime = (time: number): string => {
  const hour = Math.floor(time / 100);
  const minute = time % 100;
  return `${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
};

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
