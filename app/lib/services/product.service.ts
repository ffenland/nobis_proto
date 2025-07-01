// app/lib/services/product.service.ts
import prisma from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";

// 트레이너 목록 조회 타입
export interface ITrainerForSelection {
  id: string;
  user: {
    username: string;
  };
}

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
export const getTrainersForSelectionService = async (): Promise<
  ITrainerForSelection[]
> => {
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
