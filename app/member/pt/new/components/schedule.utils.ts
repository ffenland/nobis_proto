// components/ptNew/scheduleUtils.ts (수정 버전)
import { IDaySchedule } from "@/app/lib/services/pt-apply.service";
import {
  addThirtyMinutes,
  timeRangesOverlap,
  formatTime,
} from "@/app/lib/utils/time.utils";

// addThirtyMinutes를 re-export하여 다른 컴포넌트에서 사용할 수 있도록 함
export {
  addThirtyMinutes,
  formatTime,
  timeRangesOverlap,
} from "@/app/lib/utils/time.utils";

// 수시 스케줄 유효성 검증
export const validateCasualSchedule = (
  chosenSchedule: IDaySchedule,
  minRequiredCount: number = 2
): {
  isValid: boolean;
  error?: string;
  scheduledDates: Array<{
    date: string;
    startTime: number;
    endTime: number;
  }>;
} => {
  const scheduledDates = Object.keys(chosenSchedule)
    .sort()
    .map((dateKey) => {
      const times = chosenSchedule[dateKey];
      return {
        date: dateKey,
        startTime: times[0],
        endTime: addThirtyMinutes(times[times.length - 1]),
      };
    });

  if (scheduledDates.length < minRequiredCount) {
    return {
      isValid: false,
      error: `최소 ${minRequiredCount}개의 날짜를 선택해주세요.`,
      scheduledDates,
    };
  }

  return {
    isValid: true,
    scheduledDates,
  };
};

// 정기 스케줄 유효성 검증
export const validateRegularSchedule = (
  chosenSchedule: IDaySchedule,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _requiredCount: number
): {
  isValid: boolean;
  error?: string;
  scheduledDates: Array<{
    date: string;
    startTime: number;
    endTime: number;
  }>;
} => {
  const scheduledDates = Object.keys(chosenSchedule)
    .sort()
    .map((dateKey) => {
      const times = chosenSchedule[dateKey];
      return {
        date: dateKey,
        startTime: times[0],
        endTime: addThirtyMinutes(times[times.length - 1]),
      };
    });

  if (scheduledDates.length !== 1) {
    return {
      isValid: false,
      error: "정기 스케줄은 첫 수업 날짜만 선택해주세요.",
      scheduledDates,
    };
  }

  return {
    isValid: true,
    scheduledDates,
  };
};

// 스케줄 충돌 검사
export const checkScheduleConflicts = (
  proposedSchedules: Array<{
    date: string;
    startTime: number;
    endTime: number;
  }>,
  existingSchedules: Array<{
    date: string;
    startTime: number;
    endTime: number;
  }>
): Array<{
  date: string;
  startTime: number;
  endTime: number;
  conflictWith: Array<{
    date: string;
    startTime: number;
    endTime: number;
  }>;
}> => {
  const conflicts: Array<{
    date: string;
    startTime: number;
    endTime: number;
    conflictWith: Array<{
      date: string;
      startTime: number;
      endTime: number;
    }>;
  }> = [];

  proposedSchedules.forEach((proposed) => {
    const sameDateExisting = existingSchedules.filter(
      (existing) => existing.date === proposed.date
    );

    const conflictingSchedules = sameDateExisting.filter((existing) =>
      timeRangesOverlap(
        proposed.startTime,
        proposed.endTime,
        existing.startTime,
        existing.endTime
      )
    );

    if (conflictingSchedules.length > 0) {
      conflicts.push({
        ...proposed,
        conflictWith: conflictingSchedules,
      });
    }
  });

  return conflicts;
};

// 스케줄 요약 정보 생성
export const generateScheduleSummary = (
  chosenSchedule: IDaySchedule,
  pattern: { regular: boolean; count: number }
): {
  totalSessions: number;
  firstSession: string;
  lastSession?: string;
  weeklyPattern?: string;
} => {
  const dates = Object.keys(chosenSchedule).sort();
  const firstDate = dates[0];
  const firstTimes = chosenSchedule[firstDate];

  return {
    totalSessions: pattern.count,
    firstSession: `${firstDate} ${formatTime(firstTimes[0])}-${formatTime(
      addThirtyMinutes(firstTimes[firstTimes.length - 1])
    )}`,
    weeklyPattern: pattern.regular
      ? `매주 ${new Date(firstDate).toLocaleDateString("ko-KR", {
          weekday: "long",
        })}`
      : undefined,
  };
};
