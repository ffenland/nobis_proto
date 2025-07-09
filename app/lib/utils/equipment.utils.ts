// 단위 표준화 함수
export const normalizeUnit = (
  unit: string | null | undefined
): string | null => {
  if (!unit || typeof unit !== "string") {
    return null;
  }

  // 소문자로 변환하고 공백 제거
  const normalized = unit.toLowerCase().replace(/\s+/g, "");

  // 빈 문자열이면 null 반환
  return normalized === "" ? null : normalized;
};
