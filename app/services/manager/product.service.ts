import prisma from "@/app/lib/prisma";
import { TrainerLevel } from "@prisma/client";

// 신규 PtProduct 생성 Input 타입
export interface CreatePtProductInput {
  title: string;
  price: number;
  expiration_period: number;
  incentivePercent: number;
  description: string;
  totalCount: number;
  time: number;
  trainerLevels: TrainerLevel[];
  managerId: string;
  openedAt?: Date;
  closedAt?: Date;
}

// 매니저 권한 검증
export async function validateManagerAccess(managerId: string) {
  const manager = await prisma.manager.findUnique({
    where: { id: managerId },
    select: {
      id: true,
      fitnessCenter: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!manager) {
    throw new Error("매니저를 찾을 수 없습니다.");
  }

  return manager;
}

// 매니저가 관리하는 센터의 특정 레벨 트레이너들 조회
export async function getTrainersByLevelsForManager(
  managerId: string,
  trainerLevels: TrainerLevel[]
) {
  // 매니저 권한 검증
  await validateManagerAccess(managerId);

  // 매니저가 관리하는 센터의 해당 레벨 트레이너들 조회
  // 현재는 모든 센터의 트레이너에게 적용되게 함
  const trainers = await prisma.trainer.findMany({
    where: {
      level: { in: trainerLevels },
      working: true, // 활성 상태인 트레이너만
      // fitnessCenter: {
      //   managers: {
      //     some: { id: managerId },
      //   },
      // },
    },
    select: {
      id: true,
      level: true,
      user: {
        select: {
          username: true,
        },
      },
    },
    orderBy: [{ level: "asc" }, { user: { username: "asc" } }],
  });

  return trainers;
}

// 신규 PtProduct 생성
export async function createPtProduct(input: CreatePtProductInput) {
  const {
    title,
    price,
    expiration_period,
    incentivePercent,
    description,
    totalCount,
    time,
    trainerLevels,
    managerId,
    openedAt,
    closedAt,
  } = input;

  // 입력 검증
  if (!title.trim()) {
    throw new Error("상품명을 입력해주세요.");
  }

  if (price <= 0) {
    throw new Error("가격은 0보다 커야 합니다.");
  }

  if (expiration_period <= 0) {
    throw new Error("만료 기간은 0보다 커야 합니다.");
  }

  if (incentivePercent < 0 || incentivePercent > 100) {
    throw new Error("인센티브는 0~100% 범위여야 합니다.");
  }

  if (totalCount <= 0) {
    throw new Error("총 레슨 횟수는 0보다 커야 합니다.");
  }

  if (time <= 0) {
    throw new Error("레슨 시간은 0보다 커야 합니다.");
  }

  // 매니저 권한 검증
  await validateManagerAccess(managerId);

  // TrainerLevel이 선택된 경우, 해당 트레이너들 조회
  let targetTrainers: { id: string }[] = [];

  if (trainerLevels.length > 0) {
    const trainers = await getTrainersByLevelsForManager(
      managerId,
      trainerLevels
    );
    targetTrainers = trainers.map((trainer) => ({ id: trainer.id }));

    // 트레이너가 없어도 PT 상품 생성 허용 (나중에 트레이너 레벨 조정 가능)
  }

  // PtProduct 생성
  const ptProduct = await prisma.ptProduct.create({
    data: {
      title,
      price,
      expiration_period,
      incentivePercent,
      description,
      totalCount,
      time,
      trainerLevel: trainerLevels,
      openedAt: openedAt || new Date(),
      closedAt: closedAt || new Date("2199-12-31T23:59:59Z"),
      onSale: true,
      // 트레이너와 관계 설정
      trainer: {
        connect: targetTrainers,
      },
    },
    select: {
      id: true,
      title: true,
      price: true,
      expiration_period: true,
      incentivePercent: true,
      description: true,
      totalCount: true,
      time: true,
      trainerLevel: true,
      openedAt: true,
      closedAt: true,
      onSale: true,
      createdAt: true,
      trainer: {
        select: {
          id: true,
          level: true,
          user: {
            select: {
              username: true,
            },
          },
          fitnessCenter: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  });

  return ptProduct;
}

// 매니저가 관리하는 센터의 트레이너 레벨별 통계 조회
export async function getTrainerLevelStats(managerId: string) {
  // 매니저 권한 검증
  await validateManagerAccess(managerId);

  // 각 트레이너 레벨별 트레이너 수 조회
  const trainerStats = await prisma.trainer.groupBy({
    by: ["level"],
    where: {
      working: true,
      fitnessCenter: {
        managers: {
          some: { id: managerId },
        },
      },
    },
    _count: {
      level: true,
    },
    orderBy: {
      level: "asc",
    },
  });

  // 모든 TrainerLevel에 대해 통계 생성 (0개인 레벨도 포함)
  const allLevels: TrainerLevel[] = ["JUNIOR", "ASSOCIATE", "SENIOR", "MASTER"];

  const levelStats = allLevels.map((level) => {
    const stat = trainerStats.find((s) => s.level === level);
    return {
      level,
      count: stat?._count.level || 0,
    };
  });

  return levelStats;
}

// PtProduct 상세 정보 조회
export async function getPtProductDetail(productId: string, managerId: string) {
  // 매니저 권한 검증
  await validateManagerAccess(managerId);

  const product = await prisma.ptProduct.findUnique({
    where: { id: productId },
    select: {
      id: true,
      title: true,
      price: true,
      expiration_period: true,
      incentivePercent: true,
      description: true,
      totalCount: true,
      time: true,
      onSale: true,
      trainerLevel: true,
      openedAt: true,
      closedAt: true,
      createdAt: true,
      updatedAt: true,
      trainer: {
        select: {
          id: true,
          user: {
            select: {
              username: true,
            },
          },
        },
      },
      pt: {
        where: {
          state: "CONFIRMED",
        },
        select: {
          id: true,
        },
      },
    },
  });

  if (!product) {
    throw new Error("PT 상품을 찾을 수 없습니다.");
  }

  return {
    ...product,
    confirmedPtCount: product.pt.length,
    pt: undefined, // Remove raw pt data from response
  };
}

// PtProduct 판매 중지 또는 삭제
export async function stopOrDeletePtProduct(
  productId: string,
  managerId: string
) {
  // 매니저 권한 검증
  await validateManagerAccess(managerId);

  // 제품 존재 여부 및 연결된 PT 확인
  const product = await prisma.ptProduct.findUnique({
    where: { id: productId },
    select: {
      id: true,
      onSale: true,
      pt: {
        take: 1, // 하나라도 있는지만 확인
        select: {
          id: true,
        },
      },
    },
  });

  if (!product) {
    throw new Error("PT 상품을 찾을 수 없습니다.");
  }

  if (!product.onSale) {
    throw new Error("이미 판매 중지된 상품입니다.");
  }

  // PT가 연결되어 있는지 확인
  const hasPt = product.pt.length > 0;

  if (hasPt) {
    // PT가 있으면 판매 중지만
    const updated = await prisma.ptProduct.update({
      where: { id: productId },
      data: {
        onSale: false,
        closedAt: new Date(),
      },
      select: {
        id: true,
        title: true,
        onSale: true,
        closedAt: true,
      },
    });

    return { action: "stopped" as const, product: updated };
  } else {
    // PT가 없으면 삭제
    await prisma.ptProduct.delete({
      where: { id: productId },
    });

    return { action: "deleted" as const, product: null };
  }
}

// 타입 추론
export type CreatePtProductResult = Awaited<ReturnType<typeof createPtProduct>>;
export type GetTrainersByLevelsResult = Awaited<
  ReturnType<typeof getTrainersByLevelsForManager>
>;
export type GetTrainerLevelStatsResult = Awaited<
  ReturnType<typeof getTrainerLevelStats>
>;
export type ValidateManagerAccessResult = Awaited<
  ReturnType<typeof validateManagerAccess>
>;
export type GetPtProductDetailResult = Awaited<
  ReturnType<typeof getPtProductDetail>
>;
export type StopOrDeletePtProductResult = Awaited<
  ReturnType<typeof stopOrDeletePtProduct>
>;
