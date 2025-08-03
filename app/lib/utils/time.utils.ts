// app/lib/utils/time.utils.ts

/**
 * 시간 관리 유틸리티 함수들
 * 
 * 시간 저장 형식: Int 4자리 군대식 시간 (HHMM)
 * 예: 1430 = 14시 30분, 900 = 9시 0분
 * 
 * 주요 기능:
 * - 타입 안전성을 위한 TimeInt 타입
 * - 포괄적인 시간 유효성 검증
 * - 30분 단위 PT 수업 시간 관리
 * - 시간 계산 및 포맷팅
 */

import { z } from "zod";

// ========================================
// 타입 정의
// ========================================

/**
 * 4자리 군대식 시간을 나타내는 타입
 * 형식: HHMM (예: 1430 = 14시 30분)
 */
export type TimeInt = number & { readonly __brand: unique symbol };

/**
 * 시간 관련 에러 타입
 */
export interface TimeValidationError {
  type: 'INVALID_FORMAT' | 'INVALID_HOUR' | 'INVALID_MINUTE' | 'INVALID_RANGE';
  message: string;
  value?: number;
}

/**
 * 시간 범위 타입
 */
export interface TimeRange {
  start: TimeInt;
  end: TimeInt;
}

// ========================================
// 타입 가드 및 검증
// ========================================

/**
 * 숫자가 유효한 TimeInt인지 확인하는 타입 가드
 * @param value 검증할 값
 * @returns TimeInt 타입 가드 결과
 */
export function isTimeInt(value: number): value is TimeInt {
  return isValidTime(value).isValid;
}

/**
 * TimeInt로 변환 (유효성 검사 후)
 * @param value 변환할 숫자
 * @returns TimeInt 또는 에러
 */
export function toTimeInt(value: number): TimeInt {
  const validation = isValidTime(value);
  if (!validation.isValid) {
    throw new Error(validation.error?.message || 'Invalid time format');
  }
  return value as TimeInt;
}

/**
 * 포괄적인 시간 유효성 검증
 * @param time 검증할 시간 (HHMM 형식)
 * @returns 검증 결과 객체
 */
export function isValidTime(time: number): { 
  isValid: boolean; 
  error?: TimeValidationError 
} {
  // 4자리 숫자 형식 확인 (0-2359)
  if (!Number.isInteger(time) || time < 0 || time > 2359) {
    return {
      isValid: false,
      error: {
        type: 'INVALID_FORMAT',
        message: '시간은 0-2359 범위의 4자리 숫자여야 합니다.',
        value: time
      }
    };
  }

  const hour = Math.floor(time / 100);
  const minute = time % 100;

  // 시간 범위 검증 (0-23)
  if (hour < 0 || hour > 23) {
    return {
      isValid: false,
      error: {
        type: 'INVALID_HOUR',
        message: '시간은 0-23 범위여야 합니다.',
        value: time
      }
    };
  }

  // 분 범위 검증 (0-59)
  if (minute < 0 || minute > 59) {
    return {
      isValid: false,
      error: {
        type: 'INVALID_MINUTE',
        message: '분은 0-59 범위여야 합니다.',
        value: time
      }
    };
  }

  return { isValid: true };
}

/**
 * 시간 범위 유효성 검증
 * @param startTime 시작 시간
 * @param endTime 종료 시간
 * @returns 검증 결과
 */
export function isValidTimeRange(
  startTime: number, 
  endTime: number
): { isValid: boolean; error?: TimeValidationError } {
  const startValidation = isValidTime(startTime);
  if (!startValidation.isValid) {
    return startValidation;
  }

  const endValidation = isValidTime(endTime);
  if (!endValidation.isValid) {
    return endValidation;
  }

  if (startTime >= endTime) {
    return {
      isValid: false,
      error: {
        type: 'INVALID_RANGE',
        message: '시작 시간은 종료 시간보다 앞서야 합니다.',
        value: startTime
      }
    };
  }

  return { isValid: true };
}

// ========================================
// Zod 스키마
// ========================================

/**
 * TimeInt 유효성 검증을 위한 Zod 스키마
 */
export const timeIntSchema = z.number()
  .int()
  .min(0)
  .max(2359)
  .refine((val) => {
    const hour = Math.floor(val / 100);
    const minute = val % 100;
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
  }, {
    message: "올바른 시간 형식이 아닙니다. (HHMM 형식, 예: 1430)"
  })
  .transform((val) => val as TimeInt);

/**
 * 시간 범위 검증을 위한 Zod 스키마
 */
export const timeRangeSchema = z.object({
  start: timeIntSchema,
  end: timeIntSchema
}).refine((data) => data.start < data.end, {
  message: "시작 시간은 종료 시간보다 앞서야 합니다."
});

// ========================================
// 기존 함수들 (타입 안전성 개선)
// ========================================

/**
 * 30분을 추가하는 함수 (PT 수업용)
 * @param time 기준 시간 (HHMM 형식)
 * @returns 30분 추가된 시간
 * @example addThirtyMinutes(1430) // 1500
 * @example addThirtyMinutes(1530) // 1600
 */
export const addThirtyMinutes = (time: number): TimeInt => {
  const validation = isValidTime(time);
  if (!validation.isValid) {
    throw new Error(`Invalid time: ${validation.error?.message}`);
  }

  const hour = Math.floor(time / 100);
  const minute = time % 100;
  
  const newTime = minute === 30 ? (hour + 1) * 100 : time + 30;
  
  // 24시를 넘어가면 0시로 순환
  if (newTime >= 2400) {
    return 0 as TimeInt;
  }
  
  return newTime as TimeInt;
};

/**
 * 지정된 분만큼 시간을 빼는 함수
 * @param time 기준 시간 (HHMM 형식)
 * @param minutes 뺄 분
 * @returns 계산된 시간
 * @example subtractMinutes(1430, 30) // 1400
 * @example subtractMinutes(1000, 30) // 930
 */
export const subtractMinutes = (time: number, minutes: number): TimeInt => {
  const validation = isValidTime(time);
  if (!validation.isValid) {
    throw new Error(`Invalid time: ${validation.error?.message}`);
  }

  if (minutes < 0) {
    throw new Error('Minutes to subtract must be non-negative');
  }

  const hour = Math.floor(time / 100);
  const minute = time % 100;
  
  // 총 분으로 변환
  const totalMinutes = hour * 60 + minute;
  const newTotalMinutes = totalMinutes - minutes;
  
  // 음수가 되면 0시 0분으로 처리
  if (newTotalMinutes < 0) {
    return 0 as TimeInt;
  }
  
  // 다시 HHMM 형식으로 변환
  const newHour = Math.floor(newTotalMinutes / 60);
  const newMinute = newTotalMinutes % 60;
  
  return (newHour * 100 + newMinute) as TimeInt;
};

/**
 * 시간을 HH:MM 형식으로 포맷
 * @param time 군대식 시간 (HHMM)
 * @returns HH:MM 형식 문자열
 * @throws Error 유효하지 않은 시간인 경우
 * @example formatTime(1430) // "14:30"
 * @example formatTime(900) // "09:00"
 */
export const formatTime = (time: number): string => {
  const validation = isValidTime(time);
  if (!validation.isValid) {
    throw new Error(`Invalid time: ${validation.error?.message}`);
  }

  const hour = Math.floor(time / 100);
  const minute = time % 100;
  return `${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
};

/**
 * 간단한 시간 표시 (정시만 시간 표시, 30분은 빈칸)
 * @param time 군대식 시간 (HHMM)
 * @returns 정시는 시간, 30분은 빈 문자열
 * @throws Error 유효하지 않은 시간인 경우
 * @example formatTimeSimple(1400) // "14"
 * @example formatTimeSimple(1430) // ""
 */
export const formatTimeSimple = (time: number): string => {
  const validation = isValidTime(time);
  if (!validation.isValid) {
    throw new Error(`Invalid time: ${validation.error?.message}`);
  }

  const hour = Math.floor(time / 100);
  const minute = time % 100;
  return minute === 0 ? hour.toString() : "";
};

/**
 * HH:MM 문자열을 군대식 시간으로 파싱
 * @param timeStr HH:MM 형식 문자열
 * @returns 군대식 시간 (HHMM)
 * @throws Error 유효하지 않은 형식이거나 시간인 경우
 * @example parseTime("14:30") // 1430
 * @example parseTime("09:00") // 900
 */
export const parseTime = (timeStr: string): TimeInt => {
  if (!timeStr || typeof timeStr !== 'string') {
    throw new Error('Time string is required');
  }

  const timeParts = timeStr.split(":");
  if (timeParts.length !== 2) {
    throw new Error('Time string must be in HH:MM format');
  }

  const hour = parseInt(timeParts[0], 10);
  const minute = parseInt(timeParts[1], 10);

  if (isNaN(hour) || isNaN(minute)) {
    throw new Error('Invalid hour or minute values');
  }

  const timeInt = hour * 100 + minute;
  return toTimeInt(timeInt);
};

/**
 * 30분 단위 시간 슬롯인지 확인 (PT 수업용)
 * @param time 군대식 시간 (HHMM)
 * @returns 30분 단위 시간 슬롯 여부
 * @example isValidTimeSlot(1400) // true (14:00)
 * @example isValidTimeSlot(1430) // true (14:30)
 * @example isValidTimeSlot(1415) // false (14:15)
 */
export const isValidTimeSlot = (time: number): boolean => {
  if (!isTimeInt(time)) {
    return false;
  }

  const minute = time % 100;
  return minute === 0 || minute === 30;
};

/**
 * 시작 시간과 수업 시간으로 종료 시간 계산
 * @param startTime 시작 시간 (HHMM)
 * @param durationMinutes 수업 시간 (분)
 * @returns 종료 시간 (HHMM)
 * @throws Error 유효하지 않은 시간이거나 음수 duration인 경우
 * @example calculateEndTime(1400, 60) // 1500 (1시간 수업)
 * @example calculateEndTime(1430, 90) // 1600 (1.5시간 수업)
 */
export const calculateEndTime = (
  startTime: number,
  durationMinutes: number
): TimeInt => {
  const validation = isValidTime(startTime);
  if (!validation.isValid) {
    throw new Error(`Invalid start time: ${validation.error?.message}`);
  }

  if (durationMinutes < 0 || !Number.isInteger(durationMinutes)) {
    throw new Error('Duration must be a non-negative integer');
  }

  let currentTime = startTime;
  const thirtyMinuteSlots = Math.floor(durationMinutes / 30);

  for (let i = 0; i < thirtyMinuteSlots; i++) {
    currentTime = addThirtyMinutes(currentTime);
  }

  return currentTime as TimeInt;
};

/**
 * 30분 단위 시간 슬롯 배열 생성
 * @param openTime 시작 시간 (기본값: 600 = 06:00)
 * @param closeTime 종료 시간 (기본값: 2200 = 22:00)
 * @returns 30분 단위 시간 슬롯 배열
 * @throws Error 유효하지 않은 시간 범위인 경우
 * @example generateTimeSlots(900, 1800) // [900, 930, 1000, ..., 1730]
 */
export const generateTimeSlots = (
  openTime: number = 600,
  closeTime: number = 2200
): TimeInt[] => {
  const rangeValidation = isValidTimeRange(openTime, closeTime);
  if (!rangeValidation.isValid) {
    throw new Error(`Invalid time range: ${rangeValidation.error?.message}`);
  }

  const slots: TimeInt[] = [];
  let currentTime = openTime;

  while (currentTime < closeTime) {
    slots.push(currentTime as TimeInt);
    currentTime = addThirtyMinutes(currentTime);
    
    // 무한 루프 방지
    if (slots.length > 100) {
      throw new Error('Too many time slots generated (limit: 100)');
    }
  }

  return slots;
};

/**
 * 두 시간 범위의 겹침 여부 확인
 * @param start1 첫 번째 범위 시작 시간
 * @param end1 첫 번째 범위 종료 시간
 * @param start2 두 번째 범위 시작 시간
 * @param end2 두 번째 범위 종료 시간
 * @returns 겹침 여부
 * @throws Error 유효하지 않은 시간 범위인 경우
 * @example timeRangesOverlap(1400, 1500, 1430, 1530) // true
 * @example timeRangesOverlap(1400, 1430, 1500, 1530) // false
 */
export const timeRangesOverlap = (
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean => {
  // 모든 시간 범위 유효성 검증
  const range1Validation = isValidTimeRange(start1, end1);
  if (!range1Validation.isValid) {
    throw new Error(`Invalid first time range: ${range1Validation.error?.message}`);
  }

  const range2Validation = isValidTimeRange(start2, end2);
  if (!range2Validation.isValid) {
    throw new Error(`Invalid second time range: ${range2Validation.error?.message}`);
  }

  return start1 < end2 && start2 < end1;
};

/**
 * HTML input[type="time"]을 위한 시간 포맷
 * @param time 군대식 시간 (HHMM)
 * @returns HH:MM 형식 문자열
 * @throws Error 유효하지 않은 시간인 경우
 * @example formatTimeForInput(1430) // "14:30"
 */
export const formatTimeForInput = (time: number): string => {
  return formatTime(time);
};

/**
 * 30분 단위 시간 범위 유효성 검증 (PT 수업용)
 * @param startTime 시작 시간 (HHMM)
 * @param endTime 종료 시간 (HHMM)
 * @returns 유효성 검증 결과
 * @deprecated 대신 isValidTimeRange를 사용하세요
 */
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

/**
 * 수업 시간에 따른 30분 단위 시간 슬롯 배열 생성
 * @param startTime 시작 시간 (HHMM)
 * @param durationMinutes 수업 시간 (분)
 * @param openTime 운영 시작 시간 (기본값: 600)
 * @param closeTime 운영 종료 시간 (기본값: 2400)
 * @returns 수업 시간 슬롯 배열
 * @throws Error 유효하지 않은 매개변수인 경우
 * @example generateClassTimeSlots(1400, 60, 600, 2200) // [1400, 1430]
 */
export const generateClassTimeSlots = (
  startTime: number,
  durationMinutes: number,
  openTime: number = 600,
  closeTime: number = 2400
): TimeInt[] => {
  const validation = isValidTime(startTime);
  if (!validation.isValid) {
    throw new Error(`Invalid start time: ${validation.error?.message}`);
  }

  if (durationMinutes < 0 || !Number.isInteger(durationMinutes)) {
    throw new Error('Duration must be a non-negative integer');
  }

  const rangeValidation = isValidTimeRange(openTime, closeTime);
  if (!rangeValidation.isValid) {
    throw new Error(`Invalid operating hours: ${rangeValidation.error?.message}`);
  }

  const timeSlots: TimeInt[] = [];
  let currentTime = startTime;
  const thirtyMinuteSlots = Math.floor(durationMinutes / 30);

  for (let i = 0; i < thirtyMinuteSlots; i++) {
    if (currentTime >= closeTime || currentTime < openTime) {
      break;
    }
    timeSlots.push(currentTime as TimeInt);
    currentTime = addThirtyMinutes(currentTime);
  }

  return timeSlots;
};
/**
 * 시간 배열의 마지막 시간에서 30분 추가하여 종료 시간 계산
 * @param times 시간 배열 (HHMM 형식)
 * @returns 종료 시간 (HHMM)
 * @throws Error 빈 배열이거나 유효하지 않은 시간이 포함된 경우
 * @example getEndTime([1400, 1430]) // 1500
 */
export const getEndTime = (times: number[]): TimeInt => {
  if (!times || times.length === 0) {
    throw new Error('Time array cannot be empty');
  }

  const lastTime = times[times.length - 1];
  const validation = isValidTime(lastTime);
  if (!validation.isValid) {
    throw new Error(`Invalid time in array: ${validation.error?.message}`);
  }

  return addThirtyMinutes(lastTime);
};

/**
 * 두 Date 객체가 같은 날짜인지 비교 (시간 무시)
 * @param date1 첫 번째 날짜
 * @param date2 두 번째 날짜
 * @returns 같은 날짜 여부
 * @throws Error 유횤하지 않은 Date 객체인 경우
 * @example isSameDate(new Date('2025-01-01'), new Date('2025-01-01 15:30')) // true
 */
export const isSameDate = (date1: Date, date2: Date): boolean => {
  if (!(date1 instanceof Date) || !(date2 instanceof Date)) {
    throw new Error('Both parameters must be valid Date objects');
  }

  if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
    throw new Error('Both dates must be valid');
  }

  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

/**
 * 날짜를 한글 형식으로 포맷 (요일 포함)
 * @param date 포맷할 날짜
 * @returns 한글 형식 날짜 문자열
 * @throws Error 유효하지 않은 Date 객체인 경우
 * @example formatDateWithWeekday(new Date('2025-01-15')) // "2025년 1월 15일 수요일"
 */
export const formatDateWithWeekday = (date: Date): string => {
  if (!(date instanceof Date)) {
    throw new Error('Parameter must be a valid Date object');
  }

  if (isNaN(date.getTime())) {
    throw new Error('Date must be valid');
  }

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = date.toLocaleDateString("ko-KR", { weekday: "long" });

  return `${year}년 ${month}월 ${day}일 ${weekday}`;
};

/**
 * 날짜를 한글 형식으로 포맷 (현재 연도와 같으면 연도 생략)
 * @param dateInput 포맷할 날짜 (Date 객체 또는 날짜 문자열)
 * @returns 한글 형식 날짜 문자열
 * @throws Error 유효하지 않은 날짜인 경우
 * @example 
 * // 2025년이 현재 연도인 경우
 * formatDateWithConditionalYear('2025-03-15') // "3월 15일"
 * formatDateWithConditionalYear('2024-12-25') // "2024년 12월 25일"
 */
export const formatDateWithConditionalYear = (dateInput: Date | string): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date input');
  }

  const currentYear = new Date().getFullYear();
  const year = date.getFullYear();
  
  if (year === currentYear) {
    return date.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
    });
  }
  
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * HH:MM 문자열에 30분 추가
 * @param time HH:MM 형식 문자열
 * @returns 30분 추가된 HH:MM 형식 문자열
 * @throws Error 유효하지 않은 시간 형식인 경우
 * @example addThirtyMinutesString("14:30") // "15:00"
 * @example addThirtyMinutesString("23:30") // "00:00"
 */
export const addThirtyMinutesString = (time: string): string => {
  if (!time || typeof time !== 'string') {
    throw new Error('Time string is required');
  }

  const timeParts = time.split(":");
  if (timeParts.length !== 2) {
    throw new Error('Time string must be in HH:MM format');
  }

  let currentHour = parseInt(timeParts[0], 10);
  let currentMinute = parseInt(timeParts[1], 10);

  if (isNaN(currentHour) || isNaN(currentMinute)) {
    throw new Error('Invalid hour or minute values');
  }

  if (currentHour < 0 || currentHour > 23 || currentMinute < 0 || currentMinute > 59) {
    throw new Error('Hour must be 0-23 and minute must be 0-59');
  }

  currentMinute += 30;
  if (currentMinute === 60) {
    currentMinute = 0;
    currentHour++;
  }
  if (currentHour === 24) {
    currentHour = 0;
  }

  const formattedHour = currentHour.toString().padStart(2, "0");
  const formattedMinute = currentMinute.toString().padStart(2, "0");

  return `${formattedHour}:${formattedMinute}`;
};

/**
 * 분단위 숫자를 한국어 시간 텍스트로 변환
 * @param minutes 분단위 숫자
 * @returns 한국어 시간 텍스트
 * @throws Error 음수이거나 정수가 아닌 경우
 * @example formatMinutesToKorean(90) // "1시간 30분"
 * @example formatMinutesToKorean(60) // "1시간"
 * @example formatMinutesToKorean(30) // "30분"
 * @example formatMinutesToKorean(120) // "2시간"
 */
export const formatMinutesToKorean = (minutes: number): string => {
  // 유효성 검증
  if (!Number.isInteger(minutes) || minutes < 0) {
    throw new Error('Minutes must be a non-negative integer');
  }

  if (minutes === 0) {
    return "0분";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  let label = "";

  if (hours > 0) {
    label += `${hours}시간`;
    if (remainingMinutes > 0) {
      label += ` ${remainingMinutes}분`;
    }
  } else {
    label = `${remainingMinutes}분`;
  }

  return label;
};

/**
 * Date 객체를 한국어 날짜/시간 형식으로 포맷
 * @param date 포맷할 날짜
 * @returns 한국어 형식 날짜/시간 문자열
 * @throws Error 유효하지 않은 Date 객체인 경우
 * @example formatDateTimeKR(new Date('2025-01-15T14:30:00')) // "2025년 1월 15일 14:30"
 */
export const formatDateTimeKR = (date: Date): string => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date input');
  }
  
  const dateStr = date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const timeStr = date.toTimeString().slice(0, 5);
  
  return `${dateStr} ${timeStr}`;
};
