// Equipment 관련 타입 정의
export interface EquipmentTitleData {
  groupName: string;
  brandName?: string | null;
  primaryValue?: string | null;
  primaryUnit?: string | null;
  secondaryValue?: string | null;
  secondaryUnit?: string | null;
}

// 동적 타이틀 생성 함수
export const generateEquipmentTitle = (data: EquipmentTitleData): string => {
  const { groupName, brandName, primaryValue, primaryUnit, secondaryValue, secondaryUnit } = data;
  
  let title = groupName; // 기본: 그룹명으로 시작

  // 브랜드가 있으면 추가 (선택사항)
  if (brandName && brandName.trim()) {
    title = `${brandName} ${title}`;
  }

  // Primary 값과 단위 조합
  if (primaryValue && primaryValue.trim()) {
    if (primaryUnit && primaryUnit.trim()) {
      // 특수한 경우들 처리
      if (primaryUnit.toLowerCase() === "color") {
        // 색상인 경우: "고무밴드 옐로우"
        title = `${title} ${primaryValue}`;
      } else if (primaryUnit.toLowerCase() === "강도") {
        // 강도인 경우: "루프밴드 약"
        title = `${title} ${primaryValue}`;
      } else if (primaryUnit.toLowerCase() === "type") {
        // 타입인 경우: "줄넘기 스피드"
        title = `${title} ${primaryValue}`;
      } else if (primaryUnit.toLowerCase() === "model") {
        // 모델인 경우: "TRX 프로"
        title = `${title} ${primaryValue}`;
      } else {
        // 일반적인 경우: "덤벨 20kg", "폼롤러 60cm"
        title = `${title} ${primaryValue}${primaryUnit}`;
      }
    } else {
      // 단위가 없으면 값만 추가
      title = `${title} ${primaryValue}`;
    }
  }

  // Secondary 값과 단위 조합 (필요한 경우)
  if (secondaryValue && secondaryValue.trim() && secondaryUnit && secondaryUnit.trim()) {
    if (secondaryUnit.toLowerCase() === "color") {
      // Secondary가 색상인 경우는 이미 primary에서 처리했으므로 생략
    } else if (secondaryUnit.toLowerCase() === "level") {
      // Secondary가 레벨인 경우: "루프밴드 약 (라이트)"
      title = `${title} (${secondaryValue})`;
    } else {
      // 기타 secondary 정보: "바벨 20kg 220cm"
      title = `${title} ${secondaryValue}${secondaryUnit}`;
    }
  }

  return title.trim();
};

// Equipment 객체에서 바로 타이틀 생성하는 헬퍼 함수
export const getEquipmentTitle = (equipment: {
  group: { name: string };
  brand?: { name: string } | null;
  primaryValue?: string | null;
  primaryUnit?: string | null;
  secondaryValue?: string | null;
  secondaryUnit?: string | null;
}): string => {
  return generateEquipmentTitle({
    groupName: equipment.group.name,
    brandName: equipment.brand?.name,
    primaryValue: equipment.primaryValue,
    primaryUnit: equipment.primaryUnit,
    secondaryValue: equipment.secondaryValue,
    secondaryUnit: equipment.secondaryUnit,
  });
};

// 표시용 간단한 타이틀 (브랜드 제외)
export const getEquipmentDisplayTitle = (equipment: {
  group: { name: string };
  primaryValue?: string | null;
  primaryUnit?: string | null;
  secondaryValue?: string | null;
  secondaryUnit?: string | null;
}): string => {
  return generateEquipmentTitle({
    groupName: equipment.group.name,
    primaryValue: equipment.primaryValue,
    primaryUnit: equipment.primaryUnit,
    secondaryValue: equipment.secondaryValue,
    secondaryUnit: equipment.secondaryUnit,
  });
};

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

// Equipment 카테고리별 정렬 함수 (웨이트는 무게순, 기타는 이름순)
export const sortEquipmentByCategory = (equipments: Array<{
  group: { name: string };
  primaryValue?: string | null;
  primaryUnit?: string | null;
  [key: string]: any;
}>): Array<any> => {
  return equipments.sort((a, b) => {
    // 그룹이 다르면 그룹명으로 정렬
    if (a.group.name !== b.group.name) {
      return a.group.name.localeCompare(b.group.name, 'ko');
    }

    // 같은 그룹 내에서는 primaryValue로 정렬
    const aValue = a.primaryValue;
    const bValue = b.primaryValue;
    
    // 둘 다 숫자로 변환 가능한 경우 숫자 정렬
    const aNum = aValue ? parseFloat(aValue) : null;
    const bNum = bValue ? parseFloat(bValue) : null;
    
    if (aNum !== null && bNum !== null) {
      return aNum - bNum;
    }
    
    // 숫자가 아닌 경우 문자열 정렬
    if (aValue && bValue) {
      return aValue.localeCompare(bValue, 'ko');
    }
    
    // 하나가 null인 경우
    if (aValue && !bValue) return -1;
    if (!aValue && bValue) return 1;
    
    return 0;
  });
};
