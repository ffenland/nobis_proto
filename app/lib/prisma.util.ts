/**
 * Prisma 날짜 처리 유틸리티 함수
 * 
 * Prisma는 UTC로 날짜를 저장하므로, 한국 시간(KST, UTC+9)을 고려한 처리가 필요
 * - DB 저장 시: Date 객체의 시간을 00:00:00으로 설정하면 UTC로 변환되어 전날 15:00:00으로 저장됨
 * - DB 조회 시: 원하는 날짜의 00:00:00에서 9시간을 뺀 값으로 조회
 */

/**
 * DB에 날짜를 저장할 때 사용하는 함수
 * 시간 정보를 00:00:00으로 설정하여 날짜만 저장
 * @param dateString - 날짜 문자열 (예: "2024-01-01") 또는 Date 객체
 * @returns 시간이 00:00:00으로 설정된 Date 객체
 */
export function setDateForWrite(dateString: string | Date): Date {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * DB에서 특정 날짜를 조회할 때 사용하는 함수
 * 원하는 날짜의 00:00:00에서 9시간을 뺀 값을 반환
 * @param dateString - 조회하려는 날짜 문자열 (예: "2024-01-01") 또는 Date 객체
 * @returns 9시간이 차감된 Date 객체
 */
export function setDateForQuery(dateString: string | Date): Date {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  // 9시간(밀리초 단위) 차감
  return new Date(date.getTime() - 9 * 60 * 60 * 1000);
}

/**
 * DB에서 날짜 범위로 조회할 때 사용하는 함수
 * @param startDate - 시작 날짜
 * @param endDate - 종료 날짜
 * @returns 조회용으로 변환된 시작/종료 날짜 객체
 */
export function setDateRangeForQuery(startDate: string | Date, endDate: string | Date) {
  return {
    gte: setDateForQuery(startDate),
    lt: setDateForQuery(new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000)) // 다음날 00:00:00
  };
}