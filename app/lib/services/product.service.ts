// app/lib/services/product.service.ts
import prisma from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";

// 트레이너 목록 조회 타입
export type ITrainerForSelection = Awaited<
  ReturnType<typeof getTrainersForSelectionService>
>[number];

// PT Product 관련 타입
export interface IPtProductCreateData {
  title: string;
  price: number;
  description: string;
  totalCount: number;
  time: number;
  onSale: boolean;
  openedAt: Date;
  closedAt: Date;
  trainerIds: string[];
}

export interface IPtProductCreateResult {
  ok: boolean;
  data?: { id: string };
  error?: string;
}

// PT 상품 상세 조회용 타입
export interface IPtProductDetail {
  id: string;
  title: string;
  price: number;
  description: string;
  totalCount: number;
  time: number;
  onSale: boolean;
  openedAt: Date;
  closedAt: Date;
  trainerIds: string[];
}

// PT 상품 수정 데이터 타입 (title 제외)
export interface IPtProductUpdateData {
  price?: number;
  description?: string;
  totalCount?: number;
  time?: number;
  onSale?: boolean;
  openedAt?: Date;
  closedAt?: Date;
  trainerIds?: string[];
}

// PT 상품 수정 결과 타입
export interface IPtProductUpdateResult {
  ok: boolean;
  data?: { id: string };
  error?: string;
}
// Prisma 업데이트 데이터 타입 (트레이너 관계 포함)
interface IPrismaUpdateData {
  price?: number;
  description?: string;
  totalCount?: number;
  time?: number;
  onSale?: boolean;
  openedAt?: Date;
  closedAt?: Date;
  trainer?: {
    set: { id: string }[];
  };
}

// Membership Product 관련 타입
export interface IMembershipProductCreateData {
  title: string;
  price: number;
  description: string;
  totalCount: number;
  onSale: boolean;
  openedAt: Date;
  closedAt: Date;
}

export interface IMembershipProductCreateResult {
  ok: boolean;
  data?: { id: string };
  error?: string;
}

// 트레이너 목록 조회 서비스
export const getTrainersForSelectionService = async () => {
  try {
    const trainers = await prisma.trainer.findMany({
      select: {
        id: true,
        user: {
          select: {
            username: true,
          },
        },
      },
    });

    return trainers;
  } catch (error) {
    console.error("트레이너 목록 조회 실패:", error);
    throw new Error("트레이너 목록을 불러오는데 실패했습니다.");
  }
};

// PT Product 생성 서비스
export const createPtProductService = async (
  data: IPtProductCreateData
): Promise<IPtProductCreateResult> => {
  try {
    const newPtProduct = await prisma.ptProduct.create({
      data: {
        title: data.title,
        price: data.price,
        description: data.description,
        totalCount: data.totalCount,
        time: data.time,
        onSale: data.onSale,
        openedAt: data.openedAt,
        closedAt: data.closedAt,
        trainer: {
          connect: data.trainerIds.map((trainerId) => ({ id: trainerId })),
        },
      },
      select: {
        id: true,
      },
    });

    return {
      ok: true,
      data: { id: newPtProduct.id },
    };
  } catch (error) {
    console.error("PT Product 생성 실패:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          ok: false,
          error: "중복된 상품명이 있습니다. 다른 이름을 사용해 주세요.",
        };
      }
    }

    return {
      ok: false,
      error: "데이터베이스 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
};

// PT 상품 상세 조회 서비스
export const getPtProductDetailService = async (
  id: string
): Promise<IPtProductDetail | null> => {
  try {
    const ptProduct = await prisma.ptProduct.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        price: true,
        description: true,
        totalCount: true,
        time: true,
        onSale: true,
        openedAt: true,
        closedAt: true,
        trainer: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!ptProduct) {
      return null;
    }

    return {
      id: ptProduct.id,
      title: ptProduct.title,
      price: ptProduct.price,
      description: ptProduct.description,
      totalCount: ptProduct.totalCount,
      time: ptProduct.time,
      onSale: ptProduct.onSale,
      openedAt: ptProduct.openedAt,
      closedAt: ptProduct.closedAt,
      trainerIds: ptProduct.trainer.map((trainer) => trainer.id),
    };
  } catch (error) {
    console.error("PT 상품 상세 조회 실패:", error);
    throw new Error("PT 상품 정보를 불러오는데 실패했습니다.");
  }
};

// 변경된 필드만 필터링하는 유틸리티 함수
const filterChangedFields = (
  original: IPtProductDetail,
  updated: Partial<IPtProductDetail>
): IPtProductUpdateData => {
  const changes: IPtProductUpdateData = {};

  // 숫자 필드 비교
  if (updated.price !== undefined && updated.price !== original.price) {
    changes.price = updated.price;
  }

  if (
    updated.totalCount !== undefined &&
    updated.totalCount !== original.totalCount
  ) {
    changes.totalCount = updated.totalCount;
  }

  if (updated.time !== undefined && updated.time !== original.time) {
    changes.time = updated.time;
  }

  // 문자열 필드 비교 (trim 적용)
  if (updated.description !== undefined) {
    const originalDesc = original.description.trim();
    const updatedDesc = updated.description.trim();
    if (originalDesc !== updatedDesc) {
      changes.description = updatedDesc;
    }
  }

  // Boolean 필드 비교
  if (updated.onSale !== undefined && updated.onSale !== original.onSale) {
    changes.onSale = updated.onSale;
  }

  // Date 필드 비교
  if (updated.openedAt !== undefined) {
    const originalDate = new Date(original.openedAt)
      .toISOString()
      .split("T")[0];
    const updatedDate = new Date(updated.openedAt).toISOString().split("T")[0];
    if (originalDate !== updatedDate) {
      changes.openedAt = updated.openedAt;
    }
  }

  if (updated.closedAt !== undefined) {
    const originalDate = new Date(original.closedAt)
      .toISOString()
      .split("T")[0];
    const updatedDate = new Date(updated.closedAt).toISOString().split("T")[0];
    if (originalDate !== updatedDate) {
      changes.closedAt = updated.closedAt;
    }
  }

  // 배열 필드 비교 (trainerIds)
  if (updated.trainerIds !== undefined) {
    const originalIds = [...original.trainerIds].sort();
    const updatedIds = [...updated.trainerIds].sort();

    if (JSON.stringify(originalIds) !== JSON.stringify(updatedIds)) {
      changes.trainerIds = updated.trainerIds;
    }
  }

  return changes;
};

// PT 상품 수정 서비스
export const updatePtProductService = async (
  id: string,
  originalData: IPtProductDetail,
  updateData: Partial<IPtProductDetail>
): Promise<IPtProductUpdateResult> => {
  try {
    // 변경된 필드만 추출
    const changes = filterChangedFields(originalData, updateData);

    // 변경사항이 없으면 early return
    if (Object.keys(changes).length === 0) {
      return {
        ok: true,
        data: { id },
      };
    }

    // Prisma 업데이트 데이터 준비
    const prismaUpdateData: IPrismaUpdateData = {
      price: changes.price,
      description: changes.description,
      totalCount: changes.totalCount,
      time: changes.time,
      onSale: changes.onSale,
      openedAt: changes.openedAt,
      closedAt: changes.closedAt,
    };

    // trainerIds가 변경된 경우 관계 업데이트 처리
    if (changes.trainerIds) {
      prismaUpdateData.trainer = {
        set: changes.trainerIds.map((trainerId) => ({ id: trainerId })),
      };
    }

    const updatedPtProduct = await prisma.ptProduct.update({
      where: { id },
      data: prismaUpdateData,
      select: { id: true },
    });

    return {
      ok: true,
      data: { id: updatedPtProduct.id },
    };
  } catch (error) {
    console.error("PT Product 수정 실패:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          ok: false,
          error: "중복된 상품명이 있습니다. 다른 이름을 사용해 주세요.",
        };
      }
      if (error.code === "P2025") {
        return {
          ok: false,
          error: "수정하려는 상품을 찾을 수 없습니다.",
        };
      }
    }

    return {
      ok: false,
      error: "데이터베이스 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
};

// Membership Product 생성 서비스
export const createMembershipProductService = async (
  data: IMembershipProductCreateData
): Promise<IMembershipProductCreateResult> => {
  try {
    const newMembershipProduct = await prisma.membershipProduct.create({
      data: {
        title: data.title,
        price: data.price,
        description: data.description,
        totalCount: data.totalCount,
        onSale: data.onSale,
        openedAt: data.openedAt,
        closedAt: data.closedAt,
      },
      select: {
        id: true,
      },
    });

    return {
      ok: true,
      data: { id: newMembershipProduct.id },
    };
  } catch (error) {
    console.error("Membership Product 생성 실패:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          ok: false,
          error: "중복된 상품명이 있습니다. 다른 이름을 사용해 주세요.",
        };
      }
    }

    return {
      ok: false,
      error: "데이터베이스 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
};

// 타입 추론을 위한 헬퍼 타입들
export type GetTrainersForSelectionServiceReturn = Awaited<
  ReturnType<typeof getTrainersForSelectionService>
>;

export type CreatePtProductServiceReturn = Awaited<
  ReturnType<typeof createPtProductService>
>;

export type CreateMembershipProductServiceReturn = Awaited<
  ReturnType<typeof createMembershipProductService>
>;
export type GetPtProductDetailServiceReturn = Awaited<
  ReturnType<typeof getPtProductDetailService>
>;

export type UpdatePtProductServiceReturn = Awaited<
  ReturnType<typeof updatePtProductService>
>;
