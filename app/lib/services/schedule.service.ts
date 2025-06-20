// app/lib/services/schedule.service.ts
import prisma from "@/app/lib/prisma";
import { WeekDay } from "@prisma/client";

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
const convertRegularScheduleToSlots = (
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

  // totalCount만큼 주간 반복으로 스케줄 생성
  let currentWeek = 0;
  let generatedCount = 0;

  while (generatedCount < totalCount) {
    weekPattern.forEach((pattern) => {
      if (generatedCount >= totalCount) return;

      const scheduleDate = new Date(firstDate);
      scheduleDate.setDate(
        firstDate.getDate() +
          currentWeek * 7 +
          (pattern.dayOfWeek - firstDate.getDay())
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

// 시간 배열에서 종료 시간 계산
const getEndTime = (times: number[]): number => {
  const lastTime = times[times.length - 1];
  return addThirtyMinutes(lastTime);
};

// 30분 추가 유틸
const addThirtyMinutes = (time: number): number => {
  const hour = Math.floor(time / 100);
  const minute = time % 100;

  if (minute === 30) {
    return (hour + 1) * 100;
  } else {
    return time + 30;
  }
};

// 트레이너 가용성 검사
const checkTrainerAvailability = async (
  trainerId: string,
  schedules: IScheduleSlot[]
) => {
  const success: IScheduleSlot[] = [];
  const fail: IScheduleSlot[] = [];

  // 트레이너 스케줄 조회
  const trainerSchedule = await getTrainerScheduleService(
    trainerId,
    new Date()
  );

  for (const schedule of schedules) {
    const isAvailable = await isTimeSlotAvailable(
      schedule,
      trainerSchedule.existingSchedules,
      trainerSchedule.trainerOffs,
      trainerSchedule.repeatOffs
    );

    if (isAvailable) {
      success.push(schedule);
    } else {
      fail.push(schedule);
    }
  }

  return { success, fail };
};

// 특정 시간대 가용성 확인
const isTimeSlotAvailable = async (
  slot: IScheduleSlot,
  existingSchedules: any[],
  trainerOffs: any[],
  repeatOffs: any[]
): Promise<boolean> => {
  const slotDate = slot.date.toISOString().split("T")[0];
  const slotDayOfWeek = slot.date.getDay();

  // 기존 스케줄과 충돌 체크
  const hasConflict = existingSchedules.some((existing) => {
    const existingDate = existing.date.toISOString().split("T")[0];
    return (
      existingDate === slotDate &&
      timeRangesOverlap(
        slot.startTime,
        slot.endTime,
        existing.startTime,
        existing.endTime
      )
    );
  });

  if (hasConflict) return false;

  // 특정 날짜 OFF와 충돌 체크
  const hasOffConflict = trainerOffs.some((off) => {
    if (!off.date) return false;
    const offDate = off.date.toISOString().split("T")[0];
    return (
      offDate === slotDate &&
      timeRangesOverlap(
        slot.startTime,
        slot.endTime,
        off.startTime,
        off.endTime
      )
    );
  });

  if (hasOffConflict) return false;

  // 반복 OFF와 충돌 체크
  const weekDayEnum = weekdaysEnum.find((w) => w.key === slotDayOfWeek)?.enum;
  const hasRepeatOffConflict = repeatOffs.some((off) => {
    return (
      off.weekDay === weekDayEnum &&
      timeRangesOverlap(
        slot.startTime,
        slot.endTime,
        off.startTime,
        off.endTime
      )
    );
  });

  return !hasRepeatOffConflict;
};

// 시간 범위 겹침 확인
const timeRangesOverlap = (
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean => {
  return start1 < end2 && start2 < end1;
};

// 시간 슬롯 생성 (30분 단위)
export const generateTimeSlots = (
  openTime: number = 600,
  closeTime: number = 2200
): number[] => {
  const slots: number[] = [];

  for (let time = openTime; time < closeTime; time = addThirtyMinutes(time)) {
    slots.push(time);
  }

  return slots;
};

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
