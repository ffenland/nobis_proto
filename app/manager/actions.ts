// app/manager/actions.ts
"use server";

import prisma from "@/app/lib/prisma";
import { getSessionOrRedirect } from "@/app/lib/session";
import { Prisma, PtState } from "@prisma/client";

// Manager 대시보드 전체 통계 타입
export type ManagerDashboardStats = Prisma.PromiseReturnType<
  typeof getManagerDashboardStats
>;

// Manager 대시보드 센터별 정보 타입
export type CenterOverview = Prisma.PromiseReturnType<
  typeof getCenterOverviewStats
>;

// Manager 대시보드 전체 통계 조회
export const getManagerDashboardStats = async () => {
  const session = await getSessionOrRedirect();

  if (session.role !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다.");
  }

  // 매니저의 센터 ID 조회
  const manager = await prisma.manager.findUnique({
    where: { userId: session.id },
    select: { fitnessCenterId: true },
  });

  if (!manager) {
    throw new Error("매니저 정보를 찾을 수 없습니다.");
  }

  const fitnessCenterId = manager.fitnessCenterId;

  // 전체 센터 대시보드 통계 (매니저가 센터에 소속되지 않은 경우 전체 조회)
  const whereCondition = fitnessCenterId ? { fitnessCenterId } : {};

  // 1. 총 센터 수
  const totalCenters = await prisma.fitnessCenter.count({
    where: fitnessCenterId ? { id: fitnessCenterId } : {},
  });

  // 2. 총 트레이너 수
  const totalTrainers = await prisma.trainer.count({
    where: whereCondition,
  });

  // 3. 총 회원 수
  const totalMembers = await prisma.member.count({
    where: whereCondition,
  });

  // 4. 활성 PT 수
  const totalActivePt = await prisma.pt.count({
    where: {
      state: PtState.CONFIRMED,
      trainerConfirmed: true,
      trainer: whereCondition,
    },
  });

  // 5. 이번 달 완료된 세션 수
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const thisMonthCompletedSessions = await prisma.ptRecord.count({
    where: {
      createdAt: {
        gte: thisMonthStart,
        lte: thisMonthEnd,
      },
      items: {
        some: {},
      },
      pt: {
        trainer: whereCondition,
      },
    },
  });

  // 6. 활성 멤버십 수
  const activeMemberships = await prisma.membership.count({
    where: {
      isActive: true,
      member: whereCondition,
    },
  });

  // 7. 전체 장비(머신) 수
  const totalMachines = await prisma.machine.count({
    where: {
      fitnessCenter: fitnessCenterId ? { id: fitnessCenterId } : {},
    },
  });

  // 8. 최근 7일간 일별 세션 통계
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const recentSessions = await prisma.ptRecord.findMany({
    where: {
      createdAt: {
        gte: sevenDaysAgo,
      },
      items: {
        some: {},
      },
      pt: {
        trainer: whereCondition,
      },
    },
    select: {
      createdAt: true,
      ptSchedule: {
        select: {
          date: true,
        },
      },
    },
  });

  // 일별 세션 수 계산
  const dailySessionsMap = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    dailySessionsMap.set(dateStr, 0);
  }

  recentSessions.forEach((session) => {
    const dateStr = session.ptSchedule.date.toISOString().split("T")[0];
    const current = dailySessionsMap.get(dateStr) || 0;
    dailySessionsMap.set(dateStr, current + 1);
  });

  const dailySessions = Array.from(dailySessionsMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalCenters,
    totalTrainers,
    totalMembers,
    totalActivePt,
    thisMonthCompletedSessions,
    activeMemberships,
    totalMachines,
    dailySessions,
  };
};

// 센터별 개요 통계 조회
export const getCenterOverviewStats = async () => {
  const session = await getSessionOrRedirect();

  if (session.role !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다.");
  }

  // 매니저의 센터 ID 조회
  const manager = await prisma.manager.findUnique({
    where: { userId: session.id },
    select: { fitnessCenterId: true },
  });

  if (!manager) {
    throw new Error("매니저 정보를 찾을 수 없습니다.");
  }

  const fitnessCenterId = manager.fitnessCenterId;

  // 센터별 정보 조회 (매니저가 특정 센터에 소속된 경우 해당 센터만, 아니면 전체)
  const centers = await prisma.fitnessCenter.findMany({
    where: fitnessCenterId ? { id: fitnessCenterId } : { inOperation: true },
    select: {
      id: true,
      title: true,
      address: true,
      phone: true,
      inOperation: true,
      trainers: {
        where: { working: true },
        select: {
          id: true,
          user: {
            select: {
              username: true,
            },
          },
          pt: {
            where: {
              state: PtState.CONFIRMED,
              trainerConfirmed: true,
            },
            select: {
              id: true,
            },
          },
        },
      },
      members: {
        where: { active: true },
        select: {
          id: true,
          user: {
            select: {
              username: true,
            },
          },
          membership: {
            where: { isActive: true },
            select: {
              id: true,
            },
          },
        },
      },
      machines: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      title: "asc",
    },
  });

  // 센터별 통계 계산
  const centersWithStats = centers.map((center) => {
    const trainerCount = center.trainers.length;
    const memberCount = center.members.length;
    const activePtCount = center.trainers.reduce(
      (sum, trainer) => sum + trainer.pt.length,
      0
    );
    const activeMembershipCount = center.members.filter(
      (member) => member.membership.length > 0
    ).length;
    const machineCount = center.machines.length;

    return {
      id: center.id,
      title: center.title,
      address: center.address,
      phone: center.phone,
      inOperation: center.inOperation,
      stats: {
        trainerCount,
        memberCount,
        activePtCount,
        activeMembershipCount,
        machineCount,
        ptUtilizationRate:
          memberCount > 0
            ? Math.round((activePtCount / memberCount) * 100 * 10) / 10
            : 0,
        membershipUtilizationRate:
          memberCount > 0
            ? Math.round((activeMembershipCount / memberCount) * 100 * 10) / 10
            : 0,
      },
    };
  });

  return centersWithStats;
};

// 최근 활동 조회 (PT 승인 대기, 최근 가입 회원 등)
export const getRecentActivities = async () => {
  const session = await getSessionOrRedirect();

  if (session.role !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다.");
  }

  // 매니저의 센터 ID 조회
  const manager = await prisma.manager.findUnique({
    where: { userId: session.id },
    select: { fitnessCenterId: true },
  });

  if (!manager) {
    throw new Error("매니저 정보를 찾을 수 없습니다.");
  }

  const fitnessCenterId = manager.fitnessCenterId;
  const whereCondition = fitnessCenterId ? { fitnessCenterId } : {};

  // 1. 승인 대기중인 PT 신청 (최근 7일)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const pendingPtRequests = await prisma.pt.findMany({
    where: {
      state: PtState.PENDING,
      createdAt: {
        gte: sevenDaysAgo,
      },
      trainer: whereCondition,
    },
    select: {
      id: true,
      createdAt: true,
      member: {
        select: {
          user: {
            select: {
              username: true,
            },
          },
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
      ptProduct: {
        select: {
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  // 2. 최근 가입한 회원 (최근 7일)
  const recentMembers = await prisma.member.findMany({
    where: {
      createdAt: {
        gte: sevenDaysAgo,
      },
      ...whereCondition,
    },
    select: {
      id: true,
      createdAt: true,
      user: {
        select: {
          username: true,
          email: true,
        },
      },
      fitnessCenter: {
        select: {
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  // 3. 최근 완료된 PT 세션 (최근 3일)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const recentCompletedSessions = await prisma.ptRecord.findMany({
    where: {
      createdAt: {
        gte: threeDaysAgo,
      },
      items: {
        some: {},
      },
      pt: {
        trainer: whereCondition,
      },
    },
    select: {
      id: true,
      createdAt: true,
      pt: {
        select: {
          member: {
            select: {
              user: {
                select: {
                  username: true,
                },
              },
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
      },
      ptSchedule: {
        select: {
          date: true,
          startTime: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  return {
    pendingPtRequests,
    recentMembers,
    recentCompletedSessions,
  };
};
