// app/lib/services/trainer.service.ts (완전 수정 버전)
import prisma from "@/app/lib/prisma";
import { PtState } from "@prisma/client";

// 트레이너의 승인 대기 중인 PT 목록 조회
export const getPendingPtApplicationsService = async (trainerId: string) => {
  const pendingPts = await prisma.pt.findMany({
    where: {
      trainerId,
      state: PtState.PENDING, // PENDING 상태만
    },
    include: {
      member: {
        include: {
          user: {
            select: {
              username: true,
            },
          },
        },
      },
      ptProduct: {
        select: {
          title: true,
          totalCount: true,
          time: true,
          price: true,
        },
      },
      ptRecord: {
        include: {
          ptSchedule: {
            select: {
              date: true,
              startTime: true,
              endTime: true,
            },
          },
        },
        orderBy: {
          ptSchedule: {
            date: "asc",
          },
        },
      },
      weekTimes: {
        select: {
          weekDay: true,
          startTime: true,
          endTime: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return pendingPts.map((pt) => ({
    ...pt,
    startDate: pt.startDate.toISOString(),
    createdAt: pt.createdAt.toISOString(),
    ptSchedule: pt.ptRecord.map((record) => ({
      ...record.ptSchedule,
      date: record.ptSchedule.date.toISOString(),
    })),
  }));
};

// 트레이너의 승인된 PT 목록 조회
export const getTrainerPtListService = async (trainerId: string) => {
  const allPts = await prisma.pt.findMany({
    where: {
      trainerId,
      state: PtState.CONFIRMED, // CONFIRMED 상태만
    },
    include: {
      member: {
        include: {
          user: {
            select: {
              username: true,
            },
          },
        },
      },
      ptProduct: {
        select: {
          title: true,
          totalCount: true,
          time: true,
          price: true,
        },
      },
      ptRecord: {
        include: {
          ptSchedule: {
            select: {
              date: true,
              startTime: true,
            },
          },
        },
        orderBy: {
          ptSchedule: {
            date: "asc",
          },
        },
      },
    },
    orderBy: {
      startDate: "desc",
    },
  });

  return allPts.map((pt) => {
    // 완료된 수업 개수 계산
    const completedCount = pt.ptRecord.filter(
      (record) => record.attended === "ATTENDED"
    ).length;

    // 다음 예정된 수업 찾기
    const nextSession = pt.ptRecord.find(
      (record) =>
        record.attended === "RESERVED" &&
        new Date(record.ptSchedule.date) >= new Date()
    );

    return {
      ...pt,
      startDate: pt.startDate.toISOString(),
      createdAt: pt.createdAt.toISOString(),
      completedCount,
      nextSession: nextSession
        ? {
            recordId: nextSession.id,
            date: nextSession.ptSchedule.date.toISOString(),
            startTime: nextSession.ptSchedule.startTime,
          }
        : null,
      // PT 완료 여부 계산
      isCompleted: completedCount >= pt.ptProduct.totalCount,
    };
  });
};

// PT 승인 처리
export const approvePtApplicationService = async (
  ptId: string,
  trainerId: string
) => {
  // 1. PT가 해당 트레이너의 PENDING 상태인지 확인
  const pt = await prisma.pt.findFirst({
    where: {
      id: ptId,
      trainerId,
      state: PtState.PENDING,
    },
  });

  if (!pt) {
    throw new Error("승인할 수 없는 PT 신청입니다.");
  }

  // 2. PT 승인 처리
  const approvedPt = await prisma.pt.update({
    where: { id: ptId },
    data: {
      state: PtState.CONFIRMED,
      trainerConfirmed: true,
      description: "트레이너가 승인한 PT입니다.",
    },
  });

  // 3. 기존 PT 기록들의 상태를 RESERVED로 설정 (이미 생성되어 있음)
  const ptRecords = await prisma.ptRecord.updateMany({
    where: { ptId },
    data: { attended: "RESERVED" },
  });

  return {
    pt: approvedPt,
    recordsCreated: ptRecords.count,
  };
};

// PT 거절 처리
export const rejectPtApplicationService = async (
  ptId: string,
  trainerId: string,
  reason?: string
) => {
  // 1. PT가 해당 트레이너의 PENDING 상태인지 확인
  const pt = await prisma.pt.findFirst({
    where: {
      id: ptId,
      trainerId,
      state: PtState.PENDING,
    },
  });

  if (!pt) {
    throw new Error("거절할 수 없는 PT 신청입니다.");
  }

  // 2. PT 거절 처리 (상태 변경)
  const rejectedPt = await prisma.pt.update({
    where: { id: ptId },
    data: {
      state: PtState.REJECTED,
      description: reason || "트레이너가 거절한 PT입니다.",
    },
  });

  return rejectedPt;
};

// 트레이너 대시보드 통계
export const getTrainerDashboardStatsService = async (trainerId: string) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // 승인 대기 중인 PT 개수
  const pendingCount = await prisma.pt.count({
    where: {
      trainerId,
      state: PtState.PENDING,
    },
  });

  // 진행 중인 PT 개수 (CONFIRMED 상태이면서 아직 완료되지 않은 것)
  const confirmedPts = await prisma.pt.findMany({
    where: {
      trainerId,
      state: PtState.CONFIRMED,
    },
    include: {
      ptProduct: {
        select: {
          totalCount: true,
        },
      },
      ptRecord: {
        where: {
          attended: "ATTENDED",
        },
        select: {
          id: true,
        },
      },
    },
  });

  const activeCount = confirmedPts.filter(
    (pt) => pt.ptRecord.length < pt.ptProduct.totalCount
  ).length;

  // 오늘 수업 개수
  const todayClasses = await prisma.ptRecord.count({
    where: {
      pt: {
        trainerId,
        state: PtState.CONFIRMED,
      },
      ptSchedule: {
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  // 이번 달 완료된 수업 개수
  const thisMonthCompleted = await prisma.ptRecord.count({
    where: {
      pt: {
        trainerId,
        state: PtState.CONFIRMED,
      },
      attended: "ATTENDED",
      ptSchedule: {
        date: {
          gte: thisMonthStart,
        },
      },
    },
  });

  // 오늘의 수업 일정
  const todaySchedule = await prisma.ptRecord.findMany({
    where: {
      pt: {
        trainerId,
        state: PtState.CONFIRMED,
      },
      ptSchedule: {
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    },
    include: {
      pt: {
        include: {
          member: {
            include: {
              user: {
                select: {
                  username: true,
                },
              },
            },
          },
        },
      },
      ptSchedule: {
        select: {
          date: true,
          startTime: true,
          endTime: true,
        },
      },
    },
    orderBy: {
      ptSchedule: {
        startTime: "asc",
      },
    },
  });

  return {
    pendingCount,
    activeCount,
    todayClasses,
    thisMonthCompleted,
    todaySchedule: todaySchedule.map((record) => ({
      ...record,
      ptSchedule: {
        ...record.ptSchedule,
        date: record.ptSchedule.date.toISOString(),
      },
    })),
  };
};

// 타입 정의
export type ITrainerPendingPts = Awaited<
  ReturnType<typeof getPendingPtApplicationsService>
>;
export type ITrainerPtList = Awaited<
  ReturnType<typeof getTrainerPtListService>
>;
export type ITrainerDashboardStats = Awaited<
  ReturnType<typeof getTrainerDashboardStatsService>
>;
