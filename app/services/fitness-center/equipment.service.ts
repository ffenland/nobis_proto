import prisma from "@/app/lib/prisma";

// === Equipment 관련 서비스 ===

// 센터별 장비 목록 조회
export async function getCenterEquipments(centerId: string) {
  const [center, equipments] = await Promise.all([
    prisma.fitnessCenter.findUnique({
      where: { id: centerId },
      select: { title: true },
    }),
    prisma.equipment.findMany({
      where: {
        fitnessCenterId: centerId,
      },
      select: {
        id: true,
        title: true,
        unit: true,
        createdAt: true,
        updatedAt: true,
        images: {
          select: {
            id: true,
            cloudflareId: true,
          },
        },
      },
      orderBy: {
        title: "asc",
      },
    }),
  ]);

  if (!center) {
    throw new Error("센터를 찾을 수 없습니다.");
  }

  return {
    centerTitle: center.title,
    equipments,
  };
}

// 센터별 장비 목록 조회 (간단한 버전 - ID와 타이틀 정보만)
export async function getCenterEquipmentsSimple(centerId: string) {
  const center = await prisma.fitnessCenter.findFirst({
    where: {
      id: centerId,
    },
    select: {
      title: true,
    },
  });
  const equipments = await prisma.equipment.findMany({
    where: {
      fitnessCenterId: centerId,
    },
    select: {
      id: true,
      title: true,
      unit: true,
    },
    orderBy: {
      title: "asc",
    },
  });
  if (!center) {
    //?
  } else {
    return {
      centerTitle: center.title,
      equipments,
    };
  }
}

// 전체 장비 목록 조회 (센터 무관)
export async function getAllEquipments() {
  const equipments = await prisma.equipment.findMany({
    select: {
      id: true,
      title: true,
      unit: true,
      createdAt: true,
      fitnessCenter: {
        select: {
          id: true,
          title: true,
        },
      },
      images: {
        select: {
          id: true,
          cloudflareId: true,
        },
      },
    },
    orderBy: {
      title: "asc",
    },
  });

  return equipments;
}

// 특정 Equipment 상세 조회
export async function getEquipmentById(equipmentId: string) {
  const equipment = await prisma.equipment.findUnique({
    where: {
      id: equipmentId,
    },
    select: {
      id: true,
      title: true,
      unit: true,
      createdAt: true,
      updatedAt: true,
      fitnessCenterId: true,
      fitnessCenter: {
        select: {
          id: true,
          title: true,
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

export type GetAllEquipmentsResult = Awaited<
  ReturnType<typeof getAllEquipments>
>;

export type GetEquipmentByIdResult = Awaited<
  ReturnType<typeof getEquipmentById>
>;

// 개별 장비 타입
export type Equipment = GetCenterEquipmentsResult["equipments"][number];

// === Equipment 생성 관련 ===

// Equipment 생성 입력 타입
export interface CreateEquipmentInput {
  title: string;
  unit?: string; // 기본값 "none"
  images?: { cloudflareId: string; uploadedById: string }[]; // 이미지 정보 배열 (최대 3개)
}

// Equipment 생성
export async function createEquipment(
  fitnessCenterId: string | null,
  input: CreateEquipmentInput
) {
  const { title, unit, images = [] } = input;

  // unit이 undefined이거나 빈 문자열이면 "none"으로 설정
  const equipmentUnit = unit && unit.trim() ? unit.trim() : "none";

  const createdEquipment = await prisma.equipment.create({
    data: {
      title,
      unit: equipmentUnit,
      fitnessCenterId: fitnessCenterId || undefined,
      images:
        images.length > 0
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
      title: true,
      unit: true,
      createdAt: true,
      updatedAt: true,
      fitnessCenterId: true,
      fitnessCenter: {
        select: {
          id: true,
          title: true,
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

  return createdEquipment;
}

// Equipment 수정 입력 타입
export interface UpdateEquipmentInput {
  title?: string;
  unit?: string;
}

// Equipment 수정
export async function updateEquipment(
  equipmentId: string,
  input: UpdateEquipmentInput
) {
  const updatedEquipment = await prisma.equipment.update({
    where: {
      id: equipmentId,
    },
    data: {
      title: input.title,
      unit: input.unit,
    },
    select: {
      id: true,
      title: true,
      unit: true,
      createdAt: true,
      updatedAt: true,
      fitnessCenterId: true,
      fitnessCenter: {
        select: {
          id: true,
          title: true,
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

  return updatedEquipment;
}

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
        title: true,
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
export type CreateEquipmentResult = Awaited<ReturnType<typeof createEquipment>>;
export type UpdateEquipmentResult = Awaited<ReturnType<typeof updateEquipment>>;
export type DeleteEquipmentResult = Awaited<ReturnType<typeof deleteEquipment>>;
