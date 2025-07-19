// app/lib/services/schedule.service.ts
import prisma from "@/app/lib/prisma";
import { WeekDay, PtState } from "@prisma/client";
import { convertKSTtoUTC } from "@/app/lib/utils";
import {
  addThirtyMinutes,
  getEndTime,
  timeRangesOverlap,
  generateTimeSlots,
} from "@/app/lib/utils/time.utils";

// 스케줄 관련 타입들
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

  // 3. 트레이너 OFF (반복) -삭제됨

  return {
    existingSchedules,
    trainerOffs,
    dateRange: {
      start: firstDateOfMonth,
      end: threeMonthsLater,
    },
  };
};

// 스케줄 가능성 검증
export const validateScheduleService = async (data: {
  trainerId: string;
  chosenSchedule: IDaySchedule;
  pattern: ISchedulePattern;
  totalCount: number;
}) => {
  try {
    // 선택된 스케줄을 IScheduleSlot 배열로 변환
    let schedules: IScheduleSlot[] = [];

    if (data.pattern.regular) {
      // 정기 스케줄 변환 로직
      schedules = convertRegularScheduleToSlots(
        data.chosenSchedule,
        data.totalCount
      );
    } else {
      // 비정기 스케줄 변환 로직
      schedules = convertTempScheduleToSlots(data.chosenSchedule);
    }

    if (schedules.length === 0) {
      return {
        success: false,
        error: "선택된 스케줄이 없습니다.",
        data: { success: [], fail: [] },
      };
    }

    // 트레이너 스케줄과 충돌 검사
    const checkedSchedules = await checkTrainerAvailability(
      data.trainerId,
      schedules
    );

    return {
      success: true,
      data: checkedSchedules,
    };
  } catch (error) {
    console.error("Schedule validation error:", error);
    return {
      success: false,
      error: "스케줄 검증 중 오류가 발생했습니다.",
      data: { success: [], fail: [] },
    };
  }
};

// 정기 스케줄을 슬롯 배열로 변환
export const convertRegularScheduleToSlots = (
  chosenSchedule: IDaySchedule,
  totalCount: number
): IScheduleSlot[] => {
  const schedules: IScheduleSlot[] = [];
  const dates = Object.keys(chosenSchedule).sort();

  if (dates.length === 0) return schedules;

  const firstDate = new Date(dates[0]);

  const weekPattern = Object.keys(chosenSchedule).map((dateKey) => {
    const date = new Date(dateKey);
    const times = chosenSchedule[dateKey];
    return {
      dayOfWeek: date.getDay(),
      startTime: times[0],
      endTime: getEndTime(times),
    };
  });

  let currentWeek = 0;
  let generatedCount = 0;

  while (generatedCount < totalCount) {
    weekPattern.forEach((pattern) => {
      if (generatedCount >= totalCount) return;

      // ✅ 새로운 Date 객체 생성 및 안전한 날짜 계산
      const scheduleDate = new Date(firstDate);
      const daysToAdd =
        currentWeek * 7 + (pattern.dayOfWeek - firstDate.getDay());
      scheduleDate.setTime(
        scheduleDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000
      );

      schedules.push({
        date: scheduleDate,
        startTime: pattern.startTime,
        endTime: pattern.endTime,
      });

      generatedCount++;
    });
    currentWeek++;
  }

  return schedules;
};

// 비정기 스케줄을 슬롯 배열로 변환
const convertTempScheduleToSlots = (
  chosenSchedule: IDaySchedule
): IScheduleSlot[] => {
  const schedules: IScheduleSlot[] = [];

  Object.keys(chosenSchedule).forEach((dateKey) => {
    const times = chosenSchedule[dateKey];
    if (times.length > 0) {
      schedules.push({
        date: new Date(dateKey),
        startTime: times[0],
        endTime: getEndTime(times),
      });
    }
  });

  return schedules;
};

// 시간 배열에서 종료 시간 계산 (time.utils.ts의 getEndTime 사용)

// 트레이너 가용성 검사 - 간단하고 직관적인 버전
const checkTrainerAvailability = async (
  trainerId: string,
  schedules: IScheduleSlot[]
) => {
  const success: IScheduleSlot[] = [];
  const fail: IScheduleSlot[] = [];

  if (schedules.length === 0) {
    return { success, fail };
  }

  // 신청할 날짜들을 UTC로 변환
  const targetDates = schedules.map((s) => convertKSTtoUTC(s.date));

  // 해당 날짜들의 기존 PT 스케줄 조회 (OR 조건 사용)
  const existingPtSchedules = await prisma.ptSchedule.findMany({
    where: {
      OR: targetDates.map((date) => ({ date })),
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

  // 각 신청 스케줄에 대해 충돌 검사
  schedules.forEach((schedule) => {
    const scheduleDate = convertKSTtoUTC(schedule.date);

    // 같은 날짜의 기존 스케줄과 시간 겹침 검사
    const hasConflict = existingPtSchedules.some((existing) => {
      return (
        existing.date.getTime() === scheduleDate.getTime() &&
        timeRangesOverlap(
          schedule.startTime,
          schedule.endTime,
          existing.startTime,
          existing.endTime
        )
      );
    });

    if (hasConflict) {
      fail.push(schedule);
    } else {
      success.push(schedule);
    }
  });

  return { success, fail };
};

// 시간 범위 겹침 확인 및 시간 슬롯 생성은 time.utils.ts에서 import
// generateTimeSlots를 re-export
export { generateTimeSlots } from "@/app/lib/utils/time.utils";

// 시간 길이 계산 (duration 시간만큼)
export const calculateTimeLength = (
  startTime: number,
  duration: number,
  openTime: number = 600,
  closeTime: number = 2200
): number[] => {
  const timeLength: number[] = [];
  let currentTime = startTime;

  for (let i = 0; i < Math.floor(duration / 0.5); i++) {
    if (currentTime >= closeTime || currentTime < openTime) {
      break;
    }
    timeLength.push(currentTime);
    currentTime = addThirtyMinutes(currentTime);
  }

  return timeLength;
};

// 타입 추론
export type ITrainerScheduleFromScheduleService = Awaited<
  ReturnType<typeof getTrainerScheduleService>
>;
export type IValidateScheduleResult = Awaited<
  ReturnType<typeof validateScheduleService>
>;
export type IScheduleValidationData = IValidateScheduleResult["data"];
