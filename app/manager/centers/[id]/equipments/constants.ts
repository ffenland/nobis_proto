// app/manager/centers/[id]/equipments/constants.ts
import { EquipmentCategory } from "@prisma/client";

// 카테고리 한글 이름 매핑
export const categoryLabels: Record<EquipmentCategory, string> = {
  WEIGHT: "웨이트",
  CARDIO: "유산소",
  RESISTANCE: "저항",
  FUNCTIONAL: "기능성",
  ACCESSORY: "액세서리",
  MOBILITY: "가동성",
  CORE: "코어",
  SPECIALTY: "특수",
};

// 카테고리 색상 매핑
export const categoryColors: Record<EquipmentCategory, string> = {
  WEIGHT: "bg-blue-100 text-blue-800",
  CARDIO: "bg-red-100 text-red-800",
  RESISTANCE: "bg-green-100 text-green-800",
  FUNCTIONAL: "bg-purple-100 text-purple-800",
  ACCESSORY: "bg-yellow-100 text-yellow-800",
  MOBILITY: "bg-indigo-100 text-indigo-800",
  CORE: "bg-orange-100 text-orange-800",
  SPECIALTY: "bg-pink-100 text-pink-800",
};
