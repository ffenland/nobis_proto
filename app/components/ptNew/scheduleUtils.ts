// components/ptNew/scheduleUtils.ts
import { IDaySchedule } from "@/app/lib/services/pt-apply.service";

// 30분 추가 유틸리티 함수
export const addThirtyMinutes = (time: number): number => {
  const hour = Math.floor(time / 100);
  const minute = time % 100;
  return minute === 30 ? (hour + 1) * 100 : time + 30;
};

// 시간 범위 겹침 확인
export const timeRangesOverlap = (
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean => {
  return start1 < end2 && start2 < end1;
};

// 시간 포맷팅 함수 (HHMM → HH:MM)
export const formatTime = (time: number): string => {
  const hour = Math.floor(time / 100);
  const minute = time % 100;
  return `${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
};

// 정기 스케줄을 실제 날짜 배열로 계산하는 함수
export const calculateRegularScheduleDates = (
  chosenSchedule: IDaySchedule,
  totalCount: number,
  trainerOffs: Array<{
    date: string;
    startTime?: number;
    endTime?: number;
  }> = []
): Array<{ date: string; startTime: number; endTime: number }> => {
  const schedules: Array<{ date: string; startTime: number; endTime: number }> =
    [];
  const dates = Object.keys(chosenSchedule).sort();

  if (dates.length === 0) return schedules;

  // 첫 수업일
  const firstDate = new Date(dates[0]);

  // 요일별 패턴 생성 (요일, 시작시간, 종료시간)
  const weekPattern = Object.keys(chosenSchedule).map((dateKey) => {
    const date = new Date(dateKey);
    const times = chosenSchedule[dateKey];
    const startTime = times[0];
    const endTime = addThirtyMinutes(times[times.length - 1]);

    return {
      dayOfWeek: date.getDay(),
      startTime,
      endTime,
    };
  });

  // 요일 순서로 정렬
  weekPattern.sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  // 첫 수업일의 요일 인덱스 찾기
  const firstDayOfWeek = firstDate.getDay();
  const firstPatternIndex = weekPattern.findIndex(
    (p) => p.dayOfWeek === firstDayOfWeek
  );

  if (firstPatternIndex === -1) return schedules;

  let generatedCount = 0;
  let currentDate = new Date(firstDate);
  let patternIndex = firstPatternIndex;

  // totalCount만큼 스케줄 생성
  while (generatedCount < totalCount) {
    const pattern = weekPattern[patternIndex];
    const dateString = currentDate.toISOString().split("T")[0];

    // 트레이너 off 날짜가 아닌 경우에만 추가
    const isTrainerOff = trainerOffs.some(
      (off) =>
        off.date === dateString &&
        (!off.startTime ||
          !off.endTime ||
          timeRangesOverlap(
            pattern.startTime,
            pattern.endTime,
            off.startTime,
            off.endTime
          ))
    );

    if (!isTrainerOff) {
      schedules.push({
        date: dateString,
        startTime: pattern.startTime,
        endTime: pattern.endTime,
      });
      generatedCount++;
    }

    // 다음 날짜 계산
    patternIndex = (patternIndex + 1) % weekPattern.length;

    if (patternIndex === 0) {
      // 한 주가 끝나면 다음 주로
      const daysToAdd = 7 - (currentDate.getDay() - weekPattern[0].dayOfWeek);
      currentDate.setDate(currentDate.getDate() + daysToAdd);
    } else {
      // 같은 주 내에서 다음 요일로
      const currentPattern = weekPattern[patternIndex];
      const prevPattern = weekPattern[patternIndex - 1];
      const daysToAdd = currentPattern.dayOfWeek - prevPattern.dayOfWeek;
      currentDate.setDate(currentDate.getDate() + daysToAdd);
    }
  }

  return schedules;
};
