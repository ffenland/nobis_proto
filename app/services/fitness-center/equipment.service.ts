import prisma from "@/app/lib/prisma";
import { sortEquipmentByCategory } from "@/app/lib/utils/equipment.utils";

// === Equipment 관련 서비스 ===

// 센터별 장비 목록 조회 (새로운 구조)
export async function getCenterEquipments(centerId: string) {
  const equipments = await prisma.equipment.findMany({
    where: {
      fitnessCenterId: centerId,
    },
    select: {
      id: true,
      primaryValue: true,
      primaryUnit: true,
      secondaryValue: true,
      secondaryUnit: true,
      description: true,
      model: true,
      group: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
      brand: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // 카테고리별 정렬 적용
  return sortEquipmentByCategory(equipments);
}

// 센터별 장비 목록 조회 (간단한 버전 - ID와 타이틀 정보만)
export async function getCenterEquipmentsSimple(centerId: string) {
  const equipments = await prisma.equipment.findMany({
    where: {
      fitnessCenterId: centerId,
    },
    select: {
      id: true,
      primaryValue: true,
      primaryUnit: true,
      group: {
        select: {
          name: true,
        },
      },
    },
  });

  return sortEquipmentByCategory(equipments);
}

// 그룹별 장비 목록 조회
export async function getCenterEquipmentsByGroup(centerId: string) {
  const equipments = await getCenterEquipments(centerId);
  
  // 그룹별로 분류
  const groupedEquipments = equipments.reduce((acc, equipment) => {
    const groupName = equipment.group.name;
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(equipment);
    return acc;
  }, {} as Record<string, typeof equipments>);

  return groupedEquipments;
}

// Equipment 그룹 목록 조회
export async function getEquipmentGroups() {
  const groups = await prisma.equipmentGroup.findMany({
    select: {
      id: true,
      name: true,
      description: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return groups;
}

// Equipment 브랜드 목록 조회
export async function getEquipmentBrands() {
  const brands = await prisma.equipmentBrand.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return brands;
}

// 특정 Equipment 상세 조회
export async function getEquipmentById(equipmentId: string) {
  const equipment = await prisma.equipment.findUnique({
    where: {
      id: equipmentId,
    },
    select: {
      id: true,
      primaryValue: true,
      primaryUnit: true,
      secondaryValue: true,
      secondaryUnit: true,
      description: true,
      model: true,
      fitnessCenterId: true,
      group: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
      brand: {
        select: {
          id: true,
          name: true,
        },
      },
      images: {
        select: {
          id: true,
          cloudflareId: true,
        },
      },
    },
  });

  return equipment;
}

// 타입 추론
export type GetCenterEquipmentsResult = Awaited<
  ReturnType<typeof getCenterEquipments>
>;

export type GetCenterEquipmentsSimpleResult = Awaited<
  ReturnType<typeof getCenterEquipmentsSimple>
>;

export type GetEquipmentGroupsResult = Awaited<
  ReturnType<typeof getEquipmentGroups>
>;

export type GetEquipmentBrandsResult = Awaited<
  ReturnType<typeof getEquipmentBrands>
>;

export type GetEquipmentByIdResult = Awaited<
  ReturnType<typeof getEquipmentById>
>;

// 배열 요소 타입
export type Equipment = GetCenterEquipmentsResult[number];
export type EquipmentSimple = GetCenterEquipmentsSimpleResult[number];
export type EquipmentGroup = GetEquipmentGroupsResult[number];
export type EquipmentBrand = GetEquipmentBrandsResult[number];
