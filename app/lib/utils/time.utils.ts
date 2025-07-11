// app/lib/utils/timeUtils.ts

/**
 * PT 수업 시간 관련 유틸리티 함수들
 * 정시(00분) 또는 30분 단위로만 시간 선택 가능
 */

// 30분 추가 함수
export const addThirtyMinutes = (time: number): number => {
  const hour = Math.floor(time / 100);
  const minute = time % 100;
  return minute === 30 ? (hour + 1) * 100 : time + 30;
};

// n분 빼기 함수
export const subtractMinutes = (time: number, minutes: number): number => {
  const hour = Math.floor(time / 100);
  const minute = time % 100;
  
  // 총 분으로 변환
  const totalMinutes = hour * 60 + minute;
  const newTotalMinutes = totalMinutes - minutes;
  
  // 음수가 되면 0시 0분으로 처리
  if (newTotalMinutes < 0) {
    return 0;
  }
  
  // 다시 HHMM 형식으로 변환
  const newHour = Math.floor(newTotalMinutes / 60);
  const newMinute = newTotalMinutes % 60;
  
  return newHour * 100 + newMinute;
};

// 시간 포맷 함수 (HHMM -> HH:MM)
export const formatTime = (time: number): string => {
  const hour = Math.floor(time / 100);
  const minute = time % 100;
  return `${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
};

// 간단한 시간 표시 함수 (HHMM -> H, 30분은 빈칸)
export const formatTimeSimple = (time: number): string => {
  const hour = Math.floor(time / 100);
  const minute = time % 100;
  return minute === 0 ? hour.toString() : "";
};

// 시간 파싱 함수 (HH:MM -> HHMM)
export const parseTime = (timeStr: string): number => {
  const [hour, minute] = timeStr.split(":").map(Number);
  return hour * 100 + minute;
};

// 유효한 시간인지 확인 (30분 단위)
export const isValidTimeSlot = (time: number): boolean => {
  const minute = time % 100;
  return minute === 0 || minute === 30;
};

// 시간 범위 계산 (시작 시간과 수업 시간으로 종료 시간 계산)
export const calculateEndTime = (
  startTime: number,
  durationMinutes: number
): number => {
  let currentTime = startTime;
  const thirtyMinuteSlots = Math.floor(durationMinutes / 30);

  for (let i = 0; i < thirtyMinuteSlots; i++) {
    currentTime = addThirtyMinutes(currentTime);
  }

  return currentTime;
};

// 30분 단위 시간 슬롯 생성
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

// 시간 범위 겹침 확인
export const timeRangesOverlap = (
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean => {
  return start1 < end2 && start2 < end1;
};

// HTML select를 위한 포맷 (HH:MM)
export const formatTimeForInput = (time: number): string => {
  return formatTime(time);
};

// 시간 유효성 검증 및 에러 메시지
export const validateTimeRange = (
  startTime: number,
  endTime: number
): { isValid: boolean; error?: string } => {
  if (!isValidTimeSlot(startTime)) {
    return {
      isValid: false,
      error: "시작 시간은 정시 또는 30분 단위여야 합니다.",
    };
  }

  if (!isValidTimeSlot(endTime)) {
    return {
      isValid: false,
      error: "종료 시간은 정시 또는 30분 단위여야 합니다.",
    };
  }

  if (startTime >= endTime) {
    return {
      isValid: false,
      error: "시작 시간은 종료 시간보다 앞서야 합니다.",
    };
  }

  return { isValid: true };
};

// 수업 시간 길이 배열 생성 (30분 단위 슬롯들)
export const generateClassTimeSlots = (
  startTime: number,
  durationMinutes: number,
  openTime: number = 600,
  closeTime: number = 2400
): number[] => {
  const timeSlots: number[] = [];
  let currentTime = startTime;
  const thirtyMinuteSlots = Math.floor(durationMinutes / 30);

  for (let i = 0; i < thirtyMinuteSlots; i++) {
    if (currentTime >= closeTime || currentTime < openTime) {
      break;
    }
    timeSlots.push(currentTime);
    currentTime = addThirtyMinutes(currentTime);
  }

  return timeSlots;
};
// 시간 배열에서 종료 시간 계산
export const getEndTime = (times: number[]): number => {
  const lastTime = times[times.length - 1];
  return addThirtyMinutes(lastTime);
};

export const isSameDate = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// 날짜를 한글 형식으로 포맷하는 함수
export const formatDateWithWeekday = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = date.toLocaleDateString("ko-KR", { weekday: "long" });

  return `${year}년 ${month}월 ${day}일 ${weekday}`;
};
