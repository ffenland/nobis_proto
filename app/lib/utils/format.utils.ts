/**
 * 프론트엔드에서 데이터를 표시할 때 사용하는 포맷팅 유틸리티 함수들
 */

/**
 * 휴대폰 번호를 포맷팅하여 반환합니다.
 * - 숫자가 아닌 모든 문자를 제거
 * - 12자리: 0000-0000-0000 형식
 * - 11자리: 000-0000-0000 형식
 * - 10자리: 000-000-0000 형식
 * - 그 외: 원본 반환 (숫자만 추출)
 *
 * @param mobile - 포맷팅할 전화번호 문자열
 * @returns 포맷팅된 전화번호 문자열
 *
 * @example
 * formatMobile("010-1234-5678") // "010-1234-5678"
 * formatMobile("01012345678") // "010-1234-5678"
 * formatMobile("02-123-4567") // "02-123-4567"
 * formatMobile("0212345678") // "02-123-4567"
 * formatMobile("082012345678") // "0820-1234-5678"
 */
export function formatMobile(mobile: string): string {
  // 숫자가 아닌 모든 문자 제거
  const numbersOnly = mobile.replace(/[^0-9]/g, "");

  // 길이에 따라 포맷팅
  if (numbersOnly.length === 12) {
    // 12자리: 0000-0000-0000
    return `${numbersOnly.slice(0, 4)}-${numbersOnly.slice(
      4,
      8
    )}-${numbersOnly.slice(8, 12)}`;
  } else if (numbersOnly.length === 11) {
    // 11자리: 000-0000-0000
    return `${numbersOnly.slice(0, 3)}-${numbersOnly.slice(
      3,
      7
    )}-${numbersOnly.slice(7, 11)}`;
  } else if (numbersOnly.length === 10) {
    // 10자리: 000-000-0000
    return `${numbersOnly.slice(0, 3)}-${numbersOnly.slice(
      3,
      6
    )}-${numbersOnly.slice(6, 10)}`;
  }

  // 그 외의 경우 숫자만 추출된 원본 반환
  return numbersOnly;
}

export const toCurrencyString = (value: number | string): string => {
  // 입력 값이 문자열인 경우 숫자만 남기기
  const numericString =
    typeof value === "string" ? value.replace(/[^0-9]/g, "") : value.toString();

  // 값이 비어있거나 숫자로 변환 불가하면 '0' 반환
  if (!numericString) return "0";

  // 숫자 변환 후 locale 통화 포맷 적용 (세 자리마다 콤마)
  const num = Number(numericString);
  return num.toLocaleString();
};
