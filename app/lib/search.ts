// app/lib/search.ts

// 한글 초성 매핑
const CHOSUNG_MAP: { [key: string]: string } = {
  ㄱ: "가-깋",
  ㄲ: "까-낗",
  ㄴ: "나-닣",
  ㄷ: "다-딯",
  ㄸ: "따-띻",
  ㄹ: "라-맇",
  ㅁ: "마-밓",
  ㅂ: "바-빟",
  ㅃ: "빠-삫",
  ㅅ: "사-싷",
  ㅆ: "싸-앃",
  ㅇ: "아-잏",
  ㅈ: "자-짛",
  ㅉ: "짜-찧",
  ㅊ: "차-칳",
  ㅋ: "카-킿",
  ㅌ: "타-팋",
  ㅍ: "파-핗",
  ㅎ: "하-힣",
};

// 초성을 한글 범위로 변환
const convertChosungToRange = (chosung: string): string => {
  return CHOSUNG_MAP[chosung] || chosung;
};

// 검색어를 정규식 패턴으로 변환
const createSearchPattern = (query: string): RegExp => {
  const pattern = query
    .split("")
    .map((char) => {
      // 한글 초성인 경우
      if (CHOSUNG_MAP[char]) {
        const [start, end] = convertChosungToRange(char).split("-");
        return `[${start}-${end}]`;
      }
      // 일반 문자인 경우
      return char;
    })
    .join(".*");

  return new RegExp(pattern, "i");
};

// 범용 검색 함수
export const search = <T>(
  items: T[],
  query: string,
  searchFields: (keyof T)[]
): T[] => {
  if (!query) return items;

  const pattern = createSearchPattern(query);

  return items.filter((item) =>
    searchFields.some((field) => {
      const value = item[field];
      return typeof value === "string" && pattern.test(value);
    })
  );
};

// 사용 예시를 위한 타입
export interface Searchable {
  [key: string]: string;
}
