import prisma from "@/app/lib/prisma";

// 신규 PtProduct 생성 Input 타입
export interface CreatePtProductInput {
  title: string;
  price: number;
  expiration_period: number;
  incentivePercent: number;
  description: string;
  totalCount: number;
  time: number;
  trainerLevelIds: string[];
  masterId: string;
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

// 마스터 권한 검증
export async function validateMasterAccess(masterId: string) {
  const master = await prisma.master.findUnique({
    where: { id: masterId },
    select: {
      id: true,
    },
  });

  if (!master) {
    throw new Error("마스터를 찾을 수 없습니다.");
  }

  return master;
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
    trainerLevelIds,
    masterId,
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

  if (trainerLevelIds.length === 0) {
    throw new Error("최소 하나의 트레이너 레벨을 선택해주세요.");
  }

  // 매니저 권한 검증
  await validateMasterAccess(masterId);

  // TrainerLevel ID 검증
  const validLevels = await prisma.trainerLevel.findMany({
    where: { id: { in: trainerLevelIds } },
    select: { id: true },
  });

  if (validLevels.length !== trainerLevelIds.length) {
    throw new Error("유효하지 않은 트레이너 레벨이 포함되어 있습니다.");
  }

  // PtProduct 생성 + PtProductTrainerLevel 중간 테이블 레코드 생성
  const ptProduct = await prisma.ptProduct.create({
    data: {
      title,
      price,
      expiration_period,
      incentivePercent,
      description,
      totalCount,
      time,
      openedAt: openedAt || new Date(),
      closedAt: closedAt || new Date("2199-12-31T23:59:59Z"),
      onSale: true,
      // 중간 테이블 레코드 생성
      trainerLevels: {
        create: trainerLevelIds.map((levelId) => ({
          trainerLevelId: levelId,
          incentiveRate: incentivePercent,
        })),
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
      openedAt: true,
      closedAt: true,
      onSale: true,
      createdAt: true,
      // 중간 테이블을 통해 연결된 TrainerLevel 정보 가져오기
      trainerLevels: {
        select: {
          id: true,
          incentiveRate: true,
          trainerLevel: {
            select: {
              id: true,
              title: true,
              displayTitle: true,
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

  // 모든 트레이너 레벨 조회
  const allLevels = await prisma.trainerLevel.findMany({
    select: {
      id: true,
      title: true,
      displayTitle: true,
    },
  });

  // 각 레벨별 트레이너 수 계산
  const levelStats = await Promise.all(
    allLevels.map(async (level) => {
      const count = await prisma.trainer.count({
        where: {
          levelId: level.id,
          working: true,
          fitnessCenter: {
            managers: {
              some: { id: managerId },
            },
          },
        },
      });

      return {
        levelId: level.id,
        title: level.title,
        displayTitle: level.displayTitle,
        count,
      };
    })
  );

  return levelStats;
}

// PtProduct 상세 정보 조회
export async function getPtProductDetail(productId: string) {
  // 매니저 권한 검증

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
      openedAt: true,
      closedAt: true,
      createdAt: true,
      updatedAt: true,
      // 중간 테이블을 통해 연결된 TrainerLevel 정보
      trainerLevels: {
        select: {
          id: true,
          incentiveRate: true,
          trainerLevel: {
            select: {
              id: true,
              title: true,
              displayTitle: true,
            },
          },
        },
      },
      // 확정된 PT 수 계산용
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

  return product;
}

// PtProduct Description 업데이트
export async function updatePtProductDescription(
  productId: string,
  description: string,
  masterId: string
) {
  // 마스터 권한 검증
  await validateMasterAccess(masterId);

  // 제품 존재 여부 확인
  const product = await prisma.ptProduct.findUnique({
    where: { id: productId },
    select: {
      id: true,
      onSale: true,
    },
  });

  if (!product) {
    throw new Error("PT 상품을 찾을 수 없습니다.");
  }

  if (!product.onSale) {
    throw new Error("판매 중지된 상품은 수정할 수 없습니다.");
  }

  // Description 업데이트
  await prisma.ptProduct.update({
    where: { id: productId },
    data: { description },
  });

  return { success: true };
}

// PtProduct TrainerLevel 업데이트
export async function updatePtProductTrainerLevels(
  productId: string,
  trainerLevelIds: string[],
  masterId: string
) {
  // 마스터 권한 검증
  await validateMasterAccess(masterId);

  // 입력 검증
  if (trainerLevelIds.length === 0) {
    throw new Error("최소 하나의 트레이너 레벨을 선택해주세요.");
  }

  // 제품 존재 여부 확인
  const product = await prisma.ptProduct.findUnique({
    where: { id: productId },
    select: {
      id: true,
      onSale: true,
      incentivePercent: true,
    },
  });

  if (!product) {
    throw new Error("PT 상품을 찾을 수 없습니다.");
  }

  if (!product.onSale) {
    throw new Error("판매 중지된 상품은 수정할 수 없습니다.");
  }

  // TrainerLevel ID 검증
  const validLevels = await prisma.trainerLevel.findMany({
    where: { id: { in: trainerLevelIds } },
    select: { id: true },
  });

  if (validLevels.length !== trainerLevelIds.length) {
    throw new Error("유효하지 않은 트레이너 레벨이 포함되어 있습니다.");
  }

  // 기존 연결 삭제 및 새로운 연결 생성 (트랜잭션)
  await prisma.$transaction([
    // 기존 연결 삭제
    prisma.ptProductTrainerLevel.deleteMany({
      where: { ptProductId: productId },
    }),
    // 새로운 연결 생성
    prisma.ptProductTrainerLevel.createMany({
      data: trainerLevelIds.map((levelId) => ({
        ptProductId: productId,
        trainerLevelId: levelId,
        incentiveRate: product.incentivePercent,
      })),
    }),
  ]);

  return { success: true };
}

// PtProduct 판매 중지 또는 삭제
export async function stopOrDeletePtProduct(
  productId: string,
  masterId: string
) {
  // 마스터 권한 검증
  await validateMasterAccess(masterId);

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
    await prisma.ptProduct.update({
      where: { id: productId },
      data: {
        onSale: false,
        closedAt: new Date(),
      },
    });

    return { action: "stopped" as const };
  } else {
    // PT가 없으면 삭제
    await prisma.ptProduct.delete({
      where: { id: productId },
    });

    return { action: "deleted" as const };
  }
}

// 타입 추론
export type CreatePtProductResult = Awaited<ReturnType<typeof createPtProduct>>;
export type GetTrainerLevelStatsResult = Awaited<
  ReturnType<typeof getTrainerLevelStats>
>;
export type ValidateManagerAccessResult = Awaited<
  ReturnType<typeof validateManagerAccess>
>;
export type GetPtProductDetailResult = Awaited<
  ReturnType<typeof getPtProductDetail>
>;
export type UpdatePtProductTrainerLevelsResult = Awaited<
  ReturnType<typeof updatePtProductTrainerLevels>
>;
export type StopOrDeletePtProductResult = Awaited<
  ReturnType<typeof stopOrDeletePtProduct>
>;
