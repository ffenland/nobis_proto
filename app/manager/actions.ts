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

// 매니저 정보 조회 (사용자명 포함)
export const getManagerInfo = async () => {
  const session = await getSessionOrRedirect();

  if (session.role !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다.");
  }

  const manager = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      username: true,
    },
  });

  if (!manager) {
    throw new Error("매니저 정보를 찾을 수 없습니다.");
  }

  return {
    username: manager.username,
  };
};

// Manager 대시보드 전체 통계 조회
export const getManagerDashboardStats = async () => {
  const session = await getSessionOrRedirect();

  if (session.role !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다.");
  }

  // 매니저는 모든 센터를 총괄하므로 센터 제한 없이 전체 데이터 조회
  try {
    // 날짜 범위 미리 계산
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // 모든 쿼리를 병렬로 실행 (Promise.allSettled 사용으로 에러 격리)
    const [
      centersResult,
      trainersResult,
      membersResult,
      activePtResult,
      monthlySessionsResult,
      membershipsResult,
      machinesResult,
      equipmentsResult,
      dailySessionsResult,
    ] = await Promise.allSettled([
      // 1. 총 센터 수
      prisma.fitnessCenter.count({
        where: { inOperation: true },
      }),

      // 2. 총 트레이너 수
      prisma.trainer.count({
        where: { working: true },
      }),

      // 3. 총 회원 수
      prisma.member.count({
        where: { active: true },
      }),

      // 4. 활성 PT 수
      prisma.pt.count({
        where: {
          state: PtState.CONFIRMED,
          trainerConfirmed: true,
        },
      }),

      // 5. 이번 달 완료된 세션 수
      prisma.ptRecord.count({
        where: {
          createdAt: {
            gte: thisMonthStart,
            lte: thisMonthEnd,
          },
          items: {
            some: {},
          },
        },
      }),

      // 6. 활성 멤버십 수
      prisma.membership.count({
        where: {
          isActive: true,
        },
      }),

      // 7. 전체 머신 수
      prisma.machine.count(),

      // 8. 전체 운동기구 수 (새로운 Equipment 모델)
      prisma.equipment.count(),

      // 9. 최근 7일간 세션 데이터 (집계 쿼리로 최적화)
      prisma.ptRecord.findMany({
        where: {
          createdAt: {
            gte: sevenDaysAgo,
          },
          items: {
            some: {},
          },
        },
        select: {
          ptSchedule: {
            select: {
              date: true,
            },
          },
        },
      }),
    ]);

    // 결과 처리 및 기본값 설정
    const totalCenters =
      centersResult.status === "fulfilled" ? centersResult.value : 0;
    const totalTrainers =
      trainersResult.status === "fulfilled" ? trainersResult.value : 0;
    const totalMembers =
      membersResult.status === "fulfilled" ? membersResult.value : 0;
    const totalActivePt =
      activePtResult.status === "fulfilled" ? activePtResult.value : 0;
    const thisMonthCompletedSessions =
      monthlySessionsResult.status === "fulfilled"
        ? monthlySessionsResult.value
        : 0;
    const activeMemberships =
      membershipsResult.status === "fulfilled" ? membershipsResult.value : 0;
    const totalMachines =
      machinesResult.status === "fulfilled" ? machinesResult.value : 0;
    const totalEquipments =
      equipmentsResult.status === "fulfilled" ? equipmentsResult.value : 0;

    // 일별 세션 수 계산
    let dailySessions: { date: string; count: number }[] = [];

    if (dailySessionsResult.status === "fulfilled") {
      const sessionsData = dailySessionsResult.value;

      // 최근 7일간 날짜 맵 초기화
      const dailySessionsMap = new Map<string, number>();
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        dailySessionsMap.set(dateStr, 0);
      }

      // 세션 데이터로 카운트 업데이트
      sessionsData.forEach((session) => {
        const dateStr = session.ptSchedule.date.toISOString().split("T")[0];
        if (dailySessionsMap.has(dateStr)) {
          const current = dailySessionsMap.get(dateStr) || 0;
          dailySessionsMap.set(dateStr, current + 1);
        }
      });

      dailySessions = Array.from(dailySessionsMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } else {
      // 에러 발생 시 빈 배열로 초기화
      console.error("일별 세션 데이터 조회 실패:", dailySessionsResult.reason);
      dailySessions = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return { date: date.toISOString().split("T")[0], count: 0 };
      }).sort((a, b) => a.date.localeCompare(b.date));
    }

    // 에러 로깅 (개발 환경에서만)
    if (process.env.NODE_ENV === "development") {
      [
        centersResult,
        trainersResult,
        membersResult,
        activePtResult,
        monthlySessionsResult,
        membershipsResult,
        machinesResult,
        equipmentsResult,
      ].forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(`Dashboard query ${index + 1} failed:`, result.reason);
        }
      });
    }

    return {
      totalCenters,
      totalTrainers,
      totalMembers,
      totalActivePt,
      thisMonthCompletedSessions,
      activeMemberships,
      totalMachines: totalMachines + totalEquipments, // 머신과 운동기구 합계
      dailySessions,
    };
  } catch (error) {
    console.error("Manager dashboard stats error:", error);

    // 전체 에러 발생 시 기본값 반환
    return {
      totalCenters: 0,
      totalTrainers: 0,
      totalMembers: 0,
      totalActivePt: 0,
      thisMonthCompletedSessions: 0,
      activeMemberships: 0,
      totalMachines: 0,
      dailySessions: Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return { date: date.toISOString().split("T")[0], count: 0 };
      }).sort((a, b) => a.date.localeCompare(b.date)),
    };
  }
};

// 센터별 개요 통계 조회
export const getCenterOverviewStats = async () => {
  const session = await getSessionOrRedirect();

  if (session.role !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다.");
  }

  try {
    // 매니저는 모든 센터를 조회할 수 있으므로 전체 센터 조회
    const centers = await prisma.fitnessCenter.findMany({
      where: { inOperation: true },
      select: {
        id: true,
        title: true,
        address: true,
        phone: true,
        inOperation: true,
        // 관련 카운트를 집계하는 방식으로 최적화
        _count: {
          select: {
            trainers: {
              where: { working: true },
            },
            members: {
              where: { active: true },
            },
            machines: true,
            equipments: true,
          },
        },
        trainers: {
          where: { working: true },
          select: {
            _count: {
              select: {
                pt: {
                  where: {
                    state: PtState.CONFIRMED,
                    trainerConfirmed: true,
                  },
                },
              },
            },
          },
        },
        members: {
          where: { active: true },
          select: {
            _count: {
              select: {
                membership: {
                  where: { isActive: true },
                },
              },
            },
          },
        },
      },
      orderBy: {
        title: "asc",
      },
    });

    // 센터별 통계 계산 (최적화된 방식)
    const centersWithStats = centers.map((center) => {
      const trainerCount = center._count.trainers;
      const memberCount = center._count.members;
      const machineCount = center._count.machines + center._count.equipments; // 머신 + 운동기구

      // PT 수 계산
      const activePtCount = center.trainers.reduce(
        (sum, trainer) => sum + trainer._count.pt,
        0
      );

      // 활성 멤버십 수 계산
      const activeMembershipCount = center.members.reduce(
        (sum, member) => sum + member._count.membership,
        0
      );

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
              ? Math.round((activeMembershipCount / memberCount) * 100 * 10) /
                10
              : 0,
        },
      };
    });

    return centersWithStats;
  } catch (error) {
    console.error("Center overview stats error:", error);

    // 에러 발생 시 빈 배열 반환
    return [];
  }
};

// 최근 활동 조회 (PT 승인 대기, 최근 가입 회원 등)
export const getRecentActivities = async () => {
  const session = await getSessionOrRedirect();

  if (session.role !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다.");
  }

  try {
    // 날짜 범위 미리 계산
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // 매니저는 모든 센터의 데이터를 조회할 수 있으므로 제한 없이 병렬 조회
    const [pendingPtResult, recentMembersResult, recentSessionsResult] =
      await Promise.allSettled([
        // 1. 승인 대기중인 PT 신청 (최근 7일)
        prisma.pt.findMany({
          where: {
            state: PtState.PENDING,
            createdAt: {
              gte: sevenDaysAgo,
            },
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
        }),

        // 2. 최근 가입한 회원 (최근 7일)
        prisma.member.findMany({
          where: {
            createdAt: {
              gte: sevenDaysAgo,
            },
            active: true,
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
        }),

        // 3. 최근 완료된 PT 세션 (최근 3일)
        prisma.ptRecord.findMany({
          where: {
            createdAt: {
              gte: threeDaysAgo,
            },
            items: {
              some: {},
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
        }),
      ]);

    // 결과 처리 및 에러 핸들링
    const pendingPtRequests =
      pendingPtResult.status === "fulfilled" ? pendingPtResult.value : [];
    const recentMembers =
      recentMembersResult.status === "fulfilled"
        ? recentMembersResult.value
        : [];
    const recentCompletedSessions =
      recentSessionsResult.status === "fulfilled"
        ? recentSessionsResult.value
        : [];

    // 에러 로깅 (개발 환경에서만)
    if (process.env.NODE_ENV === "development") {
      [pendingPtResult, recentMembersResult, recentSessionsResult].forEach(
        (result, index) => {
          if (result.status === "rejected") {
            console.error(
              `Recent activities query ${index + 1} failed:`,
              result.reason
            );
          }
        }
      );
    }

    return {
      pendingPtRequests,
      recentMembers,
      recentCompletedSessions,
    };
  } catch (error) {
    console.error("Recent activities error:", error);

    // 전체 에러 발생 시 빈 배열들 반환
    return {
      pendingPtRequests: [],
      recentMembers: [],
      recentCompletedSessions: [],
    };
  }
};
