// app/lib/services/member.service.ts
import prisma from "@/app/lib/prisma";
import { PtState } from "@prisma/client";
import { cache } from "react";

// 회원 PT 목록 조회 (페이지용)
export const getMemberPtListService = async (memberId: string) => {
  const ptList = await prisma.pt.findMany({
    where: {
      memberId,
      state: {
        in: [PtState.PENDING, PtState.CONFIRMED], // REJECTED 제외
      },
    },
    select: {
      id: true,
      state: true,
      trainerConfirmed: true,
      startDate: true,
      description: true,
      ptProduct: {
        select: {
          id: true,
          title: true,
          totalCount: true,
          time: true,
          price: true,
        },
      },
      trainer: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      },
      ptRecord: {
        select: {
          id: true,
          attended: true,
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
      createdAt: "desc",
    },
  });

  return ptList.map((pt) => {
    const completedCount = pt.ptRecord.filter(
      (record) => record.attended === "ATTENDED"
    ).length;

    // 다음 예정된 세션 찾기
    const upcomingSession = pt.ptRecord.find(
      (record) =>
        record.attended === "RESERVED" &&
        new Date(record.ptSchedule.date) >= new Date()
    );

    return {
      id: pt.id,
      state: pt.state,
      trainerConfirmed: pt.trainerConfirmed,
      startDate: pt.startDate.toISOString(),
      description: pt.description,
      ptProduct: pt.ptProduct,
      trainer: pt.trainer,
      completedCount,
      totalCount: pt.ptProduct.totalCount,
      upcomingSession: upcomingSession
        ? {
            recordId: upcomingSession.id,
            date: upcomingSession.ptSchedule.date.toISOString(),
            startTime: upcomingSession.ptSchedule.startTime,
          }
        : null,
      // 상태별 분류를 위한 계산된 필드들
      isPending: pt.state === PtState.PENDING,
      isConfirmed: pt.state === PtState.CONFIRMED && pt.trainerConfirmed,
      isCompleted:
        pt.state === PtState.CONFIRMED &&
        pt.trainerConfirmed &&
        completedCount >= pt.ptProduct.totalCount,
    };
  });
};

// 회원 PT 요약 조회 (대시보드용 - 최대 3개)
export const getMemberPtSummaryService = async (memberId: string) => {
  const ptList = await getMemberPtListService(memberId);

  // 상태별 우선순위: 진행중 > 승인대기 > 완료
  const sortedPtList = ptList.sort((a, b) => {
    if (a.isConfirmed && !a.isCompleted && (!b.isConfirmed || b.isCompleted))
      return -1;
    if (b.isConfirmed && !b.isCompleted && (!a.isConfirmed || a.isCompleted))
      return 1;
    if (a.isPending && !b.isPending) return -1;
    if (b.isPending && !a.isPending) return 1;
    return 0;
  });

  return sortedPtList.slice(0, 3); // 최대 3개만 반환
};

// 회원 대시보드 통계
export const getMemberDashboardStatsService = async (memberId: string) => {
  // 전체 PT 개수 (REJECTED 제외)
  const totalPts = await prisma.pt.count({
    where: {
      memberId,
      state: {
        in: [PtState.PENDING, PtState.CONFIRMED],
      },
    },
  });

  // 승인 대기 중인 PT 개수
  const pendingPts = await prisma.pt.count({
    where: {
      memberId,
      state: PtState.PENDING,
    },
  });

  // 진행중인 PT 개수 (승인되었고 아직 완료되지 않은)
  const confirmedPts = await prisma.pt.findMany({
    where: {
      memberId,
      state: PtState.CONFIRMED,
      trainerConfirmed: true,
    },
    select: {
      id: true,
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

  // 진행중인 PT 개수 계산 (완료되지 않은 것들)
  const activePts = confirmedPts.filter(
    (pt) => pt.ptRecord.length < pt.ptProduct.totalCount
  ).length;

  // 총 운동 횟수
  const totalSessions = await prisma.ptRecord.count({
    where: {
      pt: {
        memberId,
        state: PtState.CONFIRMED,
        trainerConfirmed: true,
      },
      attended: "ATTENDED",
    },
  });

  // 이번 달 운동 횟수
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  const thisMonthSessions = await prisma.ptRecord.count({
    where: {
      pt: {
        memberId,
        state: PtState.CONFIRMED,
        trainerConfirmed: true,
      },
      attended: "ATTENDED",
      ptSchedule: {
        date: {
          gte: thisMonthStart,
        },
      },
    },
  });

  // 다음 예정된 수업
  const nextSession = await prisma.ptRecord.findFirst({
    where: {
      pt: {
        memberId,
        state: PtState.CONFIRMED,
        trainerConfirmed: true,
      },
      attended: "RESERVED",
      ptSchedule: {
        date: {
          gte: new Date(),
        },
      },
    },
    select: {
      id: true,
      ptSchedule: {
        select: {
          date: true,
          startTime: true,
          endTime: true,
        },
      },
      pt: {
        select: {
          ptProduct: {
            select: {
              title: true,
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
    },
    orderBy: {
      ptSchedule: {
        date: "asc",
      },
    },
  });

  return {
    totalPts,
    pendingPts,
    activePts,
    totalSessions,
    thisMonthSessions,
    nextSession: nextSession
      ? {
          id: nextSession.id,
          date: nextSession.ptSchedule.date.toISOString(),
          startTime: nextSession.ptSchedule.startTime,
          endTime: nextSession.ptSchedule.endTime,
          ptTitle: nextSession.pt.ptProduct.title,
          trainerName:
            nextSession.pt.trainer?.user.username || "트레이너 미배정",
        }
      : null,
  };
};

// PT 프로그램 목록 조회 (신청용)
export const getPtProgramsService = cache(async (centerId?: string) => {
  const ptPrograms = await prisma.ptProduct.findMany({
    where: {
      onSale: true,
      closedAt: {
        gt: new Date(),
      },
      ...(centerId && {
        // PtProduct에 fitnessCenterId가 없으므로 trainer를 통해 필터링
        trainer: {
          some: {
            fitnessCenterId: centerId,
          },
        },
      }),
    },
    select: {
      id: true,
      title: true,
      description: true,
      totalCount: true,
      time: true,
      price: true,
      trainer: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              username: true,
            },
          },
          introduce: true,
          fitnessCenter: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return ptPrograms;
});

// PT 프로그램별 트레이너 목록 조회
export const getPtTrainersService = cache(async (ptProductId: string) => {
  const ptProduct = await prisma.ptProduct.findUnique({
    where: { id: ptProductId },
    select: {
      trainer: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              username: true,
            },
          },
          introduce: true,
          avatar: true,
        },
      },
    },
  });

  return ptProduct?.trainer || [];
});

// 헬스장 목록 조회
export const getFitnessCentersService = cache(async () => {
  const centers = await prisma.fitnessCenter.findMany({
    select: {
      id: true,
      title: true,
      address: true,
      phone: true,
      description: true,
    },
    orderBy: {
      title: "asc",
    },
  });

  return centers;
});

// 타입 정의
export type IMemberPtList = Awaited<ReturnType<typeof getMemberPtListService>>;
export type IMemberPtSummary = Awaited<
  ReturnType<typeof getMemberPtSummaryService>
>;
export type IMemberDashboardStats = Awaited<
  ReturnType<typeof getMemberDashboardStatsService>
>;
export type IPtPrograms = Awaited<ReturnType<typeof getPtProgramsService>>;
export type IPtTrainers = Awaited<ReturnType<typeof getPtTrainersService>>;
export type IFitnessCenters = Awaited<
  ReturnType<typeof getFitnessCentersService>
>;
