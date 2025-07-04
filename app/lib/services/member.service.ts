// app/lib/services/member.service.ts
import prisma from "@/app/lib/prisma";
import { PtState } from "@prisma/client";
import { cache } from "react";
import {
  calculateCompletedSessions,
  findUpcomingSession,
  calculateAttendanceStatus,
} from "@/app/lib/utils/pt.utils";

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
          ptSchedule: {
            select: {
              date: true,
              startTime: true,
            },
          },
          items: {
            select: {
              id: true,
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

  const currentTime = new Date();

  return ptList.map((pt) => {
    // 계산된 출석 상태로 완료 세션 수 계산
    const completedCount = calculateCompletedSessions(
      pt.ptRecord.map((record) => ({
        ptSchedule: record.ptSchedule,
        items: record.items,
      })),
      currentTime
    );

    // 다음 예정된 세션 찾기
    const upcomingRecord = findUpcomingSession(
      pt.ptRecord.map((record) => ({
        ...record,
        ptSchedule: record.ptSchedule,
        items: record.items,
      })),
      currentTime
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
      upcomingSession: upcomingRecord
        ? {
            recordId: upcomingRecord.id,
            date: upcomingRecord.ptSchedule.date.toISOString(),
            startTime: upcomingRecord.ptSchedule.startTime,
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

  // 진행중인 PT 개수 계산을 위한 데이터 조회
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
        select: {
          id: true,
          ptSchedule: {
            select: {
              date: true,
              startTime: true,
            },
          },
          items: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  const currentTime = new Date();

  // 진행중인 PT 개수 계산 (완료되지 않은 것들)
  const activePts = confirmedPts.filter((pt) => {
    const completedSessions = calculateCompletedSessions(
      pt.ptRecord.map((record) => ({
        ptSchedule: record.ptSchedule,
        items: record.items,
      })),
      currentTime
    );
    return completedSessions < pt.ptProduct.totalCount;
  }).length;

  // 총 운동 횟수 계산을 위한 모든 PT 기록 조회
  const allPtRecords = await prisma.ptRecord.findMany({
    where: {
      pt: {
        memberId,
        state: PtState.CONFIRMED,
        trainerConfirmed: true,
      },
    },
    select: {
      id: true,
      ptSchedule: {
        select: {
          date: true,
          startTime: true,
        },
      },
      items: {
        select: {
          id: true,
        },
      },
    },
  });

  // 총 운동 횟수
  const totalSessions = calculateCompletedSessions(
    allPtRecords.map((record) => ({
      ptSchedule: record.ptSchedule,
      items: record.items,
    })),
    currentTime
  );

  // 이번 달 운동 횟수
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  const thisMonthRecords = allPtRecords.filter(
    (record) => new Date(record.ptSchedule.date) >= thisMonthStart
  );

  const thisMonthSessions = calculateCompletedSessions(
    thisMonthRecords.map((record) => ({
      ptSchedule: record.ptSchedule,
      items: record.items,
    })),
    currentTime
  );

  // 다음 예정된 수업
  const nextSessionRecord = await prisma.ptRecord.findFirst({
    where: {
      pt: {
        memberId,
        state: PtState.CONFIRMED,
        trainerConfirmed: true,
      },
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
      items: {
        select: {
          id: true,
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

  // 다음 세션이 RESERVED 상태인지 확인
  let nextSession = null;
  if (nextSessionRecord) {
    const status = calculateAttendanceStatus(
      {
        ptSchedule: nextSessionRecord.ptSchedule,
        items: nextSessionRecord.items,
      },
      currentTime
    );

    if (status === "RESERVED") {
      nextSession = {
        id: nextSessionRecord.id,
        date: nextSessionRecord.ptSchedule.date.toISOString(),
        startTime: nextSessionRecord.ptSchedule.startTime,
        endTime: nextSessionRecord.ptSchedule.endTime,
        ptTitle: nextSessionRecord.pt.ptProduct.title,
        trainerName:
          nextSessionRecord.pt.trainer?.user.username || "트레이너 미배정",
      };
    }
  }

  return {
    totalPts,
    pendingPts,
    activePts,
    totalSessions,
    thisMonthSessions,
    nextSession,
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
          // avatar: true, // 주석: avatar 필드가 없어서 제거
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
