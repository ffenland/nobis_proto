// app/services/member/pt/pt.service.ts
import prisma from "@/app/lib/prisma";
import { PtState } from "@prisma/client";
import { cache } from "react";

// 헬스장 목록 조회
export const getFitnessCentersForPtApply = cache(async () => {
  const centers = await prisma.fitnessCenter.findMany({
    select: {
      id: true,
      title: true,
      address: true,
      phone: true,
      openingHours: {
        select: {
          id: true,
          dayOfWeek: true,
          openTime: true,
          closeTime: true,
          isClosed: true,
        },
      },
    },
    orderBy: {
      title: "asc",
    },
  });

  return centers;
});

// 타입 추론
export type FitnessCentersForPtApply = Awaited<
  ReturnType<typeof getFitnessCentersForPtApply>
>;

// 센터별 트레이너 및 PT 프로그램 조회
export const getTrainersWithPtProgramsByCenter = async (centerId: string) => {
  // 해당 센터의 트레이너들과 그들이 담당하는 PT 프로그램 조회
  // Trainer → TrainerLevel → PtProductTrainerLevel → PtProduct 경로로 조회
  const trainers = await prisma.trainer.findMany({
    where: {
      fitnessCenterId: centerId,
      working: true, // 근무 중인 트레이너만
    },
    select: {
      id: true,
      user: {
        select: {
          id: true,
          username: true,
          avatarImage: {
            select: {
              cloudflareId: true,
            },
          },
        },
      },
      introduce: true,
      level: {
        select: {
          id: true,
          title: true,
          displayTitle: true,
          ptProducts: {
            where: {
              ptProduct: {
                onSale: true,
                closedAt: {
                  gt: new Date(),
                },
              },
            },
            select: {
              ptProduct: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  price: true,
                  totalCount: true,
                  time: true,
                  expiration_period: true,
                },
              },
            },
            orderBy: {
              ptProduct: {
                price: "asc",
              },
            },
          },
        },
      },
    },
    orderBy: {
      user: {
        username: "asc",
      },
    },
  });

  // 데이터 변환: ptProducts 배열을 평탄화
  return trainers.map((trainer) => ({
    ...trainer,
    ptProducts: trainer.level?.ptProducts.map((tp) => tp.ptProduct) ?? [],
  }));
};

// 타입 추론
export type TrainersWithPtProgramsByCenter = Awaited<
  ReturnType<typeof getTrainersWithPtProgramsByCenter>
>;

// PT 신청 데이터 타입
export interface PtApplicationData {
  centerId: string;
  ptProductId: string;
  trainerId: string;
  startDate: Date;
  description?: string;
}

// PENDING PT 체크 관련 타입
export interface IPendingPt {
  id: string;
  ptTitle: string;
  trainerName: string;
  appliedDate: string;
  price: number;
  totalCount: number;
}

export interface IPendingPtCheck {
  hasPending: boolean;
  pendingPt?: IPendingPt | null;
}

// PT 신청 서비스 함수
export const applyForPt = async (
  memberId: string,
  applicationData: PtApplicationData
) => {
  const { centerId, ptProductId, trainerId, startDate, description } =
    applicationData;

  // PT 상품 정보 조회 (가격, 수업 횟수 등)
  const ptProduct = await prisma.ptProduct.findUnique({
    where: { id: ptProductId },
    select: {
      id: true,
      title: true,
      price: true,
      totalCount: true,
      expiration_period: true,
    },
  });

  if (!ptProduct) {
    throw new Error("PT 상품을 찾을 수 없습니다.");
  }

  // 트레이너가 해당 센터에 속하는지 확인
  const trainer = await prisma.trainer.findFirst({
    where: {
      id: trainerId,
      fitnessCenterId: centerId,
    },
    select: { id: true },
  });

  if (!trainer) {
    throw new Error("해당 센터의 트레이너가 아닙니다.");
  }

  // 이미 PENDING 상태의 PT 신청이 있는지 확인
  const existingPending = await prisma.pt.findFirst({
    where: {
      memberId,
      state: "PENDING",
    },
    select: { id: true },
  });

  if (existingPending) {
    throw new Error("이미 승인 대기 중인 PT 신청이 있습니다.");
  }

  // PT 신청 생성
  const newPt = await prisma.pt.create({
    data: {
      memberId,
      ptProductId,
      trainerId,
      startDate,
      state: "PENDING",
      description: description || "",
      goals: "", // 기본값
    },
    select: {
      id: true,
      state: true,
      startDate: true,
      ptProduct: {
        select: {
          title: true,
          price: true,
          expiration_period: true,
          totalCount: true,
        },
      },
      trainer: {
        select: {
          user: {
            select: {
              username: true,
            },
          },
        },
      },
    },
  });

  return newPt;
};

// PENDING PT 체크 함수
export const checkPendingPt = async (
  memberId: string
): Promise<IPendingPtCheck> => {
  // PENDING 상태이고 시작일이 미래인 PT 조회
  const pendingPt = await prisma.pt.findFirst({
    where: {
      memberId,
      state: "PENDING",
      startDate: {
        gt: new Date(), // 현재 시점보다 미래
      },
    },
    select: {
      id: true,
      createdAt: true,
      ptProduct: {
        select: {
          title: true,
          price: true,
          totalCount: true,
        },
      },
      trainer: {
        select: {
          user: {
            select: {
              username: true,
            },
          },
        },
      },
    },
  });

  if (!pendingPt) {
    return {
      hasPending: false,
      pendingPt: null,
    };
  }

  return {
    hasPending: true,
    pendingPt: {
      id: pendingPt.id,
      ptTitle: pendingPt.ptProduct.title,
      trainerName: pendingPt.trainer?.user.username || "트레이너 미배정",
      appliedDate: pendingPt.createdAt.toISOString(),
      price: pendingPt.ptProduct.price,
      totalCount: pendingPt.ptProduct.totalCount,
    },
  };
};

// 회원의 활성 PT 조회 (단일 PT 페이지용)
export const getMemberActivePt = async (memberId: string) => {
  const activePt = await prisma.pt.findFirst({
    where: {
      memberId,
      state: PtState.CONFIRMED,
    },
    select: {
      id: true,
      state: true,
      description: true,
      goals: true,
      startDate: true,
      payment: {
        select: {
          method: true,
          amount: true,
          discount: true,
          paidAt: true,
        },
      },
      ptProduct: {
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          totalCount: true,
          time: true,
          expiration_period: true,
        },
      },
      trainer: {
        select: {
          id: true,
          introduce: true,
          user: {
            select: {
              id: true,
              username: true,
              mobile: true,
              avatarImage: {
                select: {
                  cloudflareId: true,
                },
              },
            },
          },
          fitnessCenter: {
            select: {
              id: true,
              title: true,
              address: true,
              phone: true,
            },
          },
        },
      },
      lessons: {
        select: {
          id: true,
          scheduledAt: true,
          endAt: true,
          memo: true,
          records: {
            select: {
              id: true,
              entry: true,
              type: true,
              title: true,
            },
          },
        },
        orderBy: {
          scheduledAt: "desc",
        },
        take: 5, // 최근 5개 수업만
      },
    },
    orderBy: {
      startDate: "desc", // 가장 최근 PT
    },
  });

  if (!activePt) {
    return null;
  }

  const now = new Date();

  // 완료된 수업 수 계산 (과거 날짜이고 기록이 있는 수업)
  const completedLessons = activePt.lessons.filter(
    (lesson) => lesson.scheduledAt < now && lesson.records.length > 0
  );

  // 다음 예정된 수업 찾기 (미래 날짜인 수업 중 가장 가까운 것)
  const upcomingLessons = activePt.lessons
    .filter((lesson) => lesson.scheduledAt > now)
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  const nextLesson = upcomingLessons[0] || null;

  // 진행률 계산
  const completedCount = completedLessons.length;
  const totalCount = activePt.ptProduct.totalCount;
  const progressPercentage = Math.round((completedCount / totalCount) * 100);

  return {
    id: activePt.id,
    state: activePt.state,
    description: activePt.description,
    goals: activePt.goals,
    startDate: activePt.startDate.toISOString(),
    paymentAmount: activePt.payment?.amount ?? 0,
    ptProduct: activePt.ptProduct,
    trainer: activePt.trainer,
    progress: {
      completed: completedCount,
      total: totalCount,
      percentage: progressPercentage,
    },
    nextLesson: nextLesson
      ? {
          id: nextLesson.id,
          scheduledAt: nextLesson.scheduledAt.toISOString(),
          endAt: nextLesson.endAt.toISOString(),
          duration: Math.floor(
            (nextLesson.endAt.getTime() - nextLesson.scheduledAt.getTime()) /
              (1000 * 60)
          ), // 호환성을 위해 계산
        }
      : null,
    recentLessons: activePt.lessons.map((lesson) => ({
      id: lesson.id,
      scheduledAt: lesson.scheduledAt.toISOString(),
      endAt: lesson.endAt.toISOString(),
      duration: Math.floor(
        (lesson.endAt.getTime() - lesson.scheduledAt.getTime()) / (1000 * 60)
      ), // 호환성을 위해 계산
      memo: lesson.memo,
      recordsCount: lesson.records.length,
      isCompleted: lesson.scheduledAt < now && lesson.records.length > 0,
    })),
  };
};

// 타입 추론
export type GetMemberActivePtResult = Awaited<
  ReturnType<typeof getMemberActivePt>
>;
