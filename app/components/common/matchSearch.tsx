import { getChoseong } from "es-hangul";

export const matchSearch = <T extends object>(
  itemList: T[],
  index: keyof T,
  query: string
) => {
  if (!query) {
    return [];
  }

  if (!isNaN(Number(query)) && query.length < 3) {
    return [];
  }

  return itemList.filter((item: T) => {
    const fieldValue = String(item[index]).replace(/\s/g, "");
    return (
      fieldValue.includes(query) ||
      fieldValue.toLocaleLowerCase().includes(query) ||
      isChosungMatch(query, fieldValue)
    );
  });
};

const isChosungMatch = (query: string, item: string) => {
  const itemChosung = getChoseong(item);
  const queryChosung = getChoseong(query);
  return itemChosung.includes(queryChosung);
};
