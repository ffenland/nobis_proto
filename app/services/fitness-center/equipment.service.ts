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

// === Equipment 생성 관련 ===

// Equipment 생성 입력 타입
export interface CreateEquipmentInput {
  groupId: string;
  brandId?: string;
  primaryValues: string[];  // 여러 개의 primaryValue (예: ["2", "3", "4", "5"] for kg)
  primaryUnit: string;
  secondaryValue?: string;
  secondaryUnit?: string;
  description?: string;
  model?: string;
  images?: { cloudflareId: string; uploadedById: string }[];  // 이미지 정보 배열 (최대 3개)
}

// Equipment 일괄 생성
export async function createEquipments(
  fitnessCenterId: string,
  input: CreateEquipmentInput
) {
  const {
    groupId,
    brandId,
    primaryValues,
    primaryUnit,
    secondaryValue,
    secondaryUnit,
    description,
    model,
    images = [],
  } = input;

  // 트랜잭션으로 여러 Equipment 생성
  const createdEquipments = await prisma.$transaction(
    primaryValues.map((primaryValue) =>
      prisma.equipment.create({
        data: {
          fitnessCenterId,
          groupId,
          brandId: brandId || undefined,
          primaryValue,
          primaryUnit,
          secondaryValue,
          secondaryUnit,
          description,
          model,
          images: images.length > 0
            ? {
                create: images.slice(0, 3).map((img) => ({
                  cloudflareId: img.cloudflareId,
                  type: "EQUIPMENT" as const,
                  uploadedById: img.uploadedById,
                })),
              }
            : undefined,
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
          images: {
            select: {
              id: true,
              cloudflareId: true,
            },
          },
        },
      })
    )
  );

  return createdEquipments;
}

// 타입 추론
export type CreateEquipmentsResult = Awaited<
  ReturnType<typeof createEquipments>
>;

// === Equipment 그룹/브랜드 생성 관련 ===

// Equipment 그룹 생성 입력 타입
export interface CreateEquipmentGroupInput {
  name: string;
  description?: string;
}

// Equipment 브랜드 생성 입력 타입
export interface CreateEquipmentBrandInput {
  name: string;
}

// Equipment 그룹 생성
export async function createEquipmentGroup(input: CreateEquipmentGroupInput) {
  const group = await prisma.equipmentGroup.create({
    data: {
      name: input.name,
      description: input.description,
    },
    select: {
      id: true,
      name: true,
      description: true,
    },
  });

  return group;
}

// Equipment 브랜드 생성
export async function createEquipmentBrand(input: CreateEquipmentBrandInput) {
  const brand = await prisma.equipmentBrand.create({
    data: {
      name: input.name,
    },
    select: {
      id: true,
      name: true,
    },
  });

  return brand;
}

// 타입 추론
export type CreateEquipmentGroupResult = Awaited<
  ReturnType<typeof createEquipmentGroup>
>;

export type CreateEquipmentBrandResult = Awaited<
  ReturnType<typeof createEquipmentBrand>
>;

// === Equipment 삭제 관련 ===

// Equipment 삭제
export async function deleteEquipment(equipmentId: string) {
  // 트랜잭션으로 이미지와 함께 삭제
  const result = await prisma.$transaction(async (tx) => {
    // Equipment의 이미지들 먼저 삭제
    await tx.image.deleteMany({
      where: {
        equipmentId: equipmentId,
      },
    });

    // Equipment 삭제
    const deletedEquipment = await tx.equipment.delete({
      where: {
        id: equipmentId,
      },
      select: {
        id: true,
        fitnessCenterId: true,
      },
    });

    return deletedEquipment;
  });

  return result;
}

// === Equipment 이미지 관리 관련 ===
// 이미지 업로드 및 관리는 통합 미디어 시스템(/app/services/media/media.service.ts)을 사용합니다.
// - 업로드: /api/media/images/upload + /api/media/images/confirm
// - 삭제: /api/media/images/[id]

// 타입 추론
export type DeleteEquipmentResult = Awaited<ReturnType<typeof deleteEquipment>>;

// 배열 요소 타입
export type Equipment = GetCenterEquipmentsResult[number];
export type EquipmentSimple = GetCenterEquipmentsSimpleResult[number];
export type EquipmentGroup = GetEquipmentGroupsResult[number];
export type EquipmentBrand = GetEquipmentBrandsResult[number];
