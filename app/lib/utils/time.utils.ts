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

// 시간 포맷 함수 (HHMM -> HH:MM)
export const formatTime = (time: number): string => {
  const hour = Math.floor(time / 100);
  const minute = time % 100;
  return `${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
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
  durationHours: number
): number => {
  let currentTime = startTime;
  const thirtyMinuteSlots = Math.floor(durationHours * 2); // 0.5시간씩 계산

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
  durationHours: number,
  openTime: number = 600,
  closeTime: number = 2200
): number[] => {
  const timeSlots: number[] = [];
  let currentTime = startTime;
  const thirtyMinuteSlots = Math.floor(durationHours * 2);

  for (let i = 0; i < thirtyMinuteSlots; i++) {
    if (currentTime >= closeTime || currentTime < openTime) {
      break;
    }
    timeSlots.push(currentTime);
    currentTime = addThirtyMinutes(currentTime);
  }

  return timeSlots;
};
