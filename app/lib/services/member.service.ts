// app/lib/services/member.service.ts (PtState 적용 완전 수정 버전)
import prisma from "@/app/lib/prisma";
import { PtState } from "@prisma/client";

// 회원의 PT 목록 조회
export const getMemberPtListService = async (memberId: string) => {
  const ptList = await prisma.pt.findMany({
    where: {
      memberId,
      // PENDING, CONFIRMED 상태 모두 포함 (REJECTED는 제외)
      state: {
        in: [PtState.PENDING, PtState.CONFIRMED],
      },
    },
    include: {
      trainer: {
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
      createdAt: "desc",
    },
  });

  return ptList.map((pt) => {
    // 완료된 수업 개수 계산
    const completedCount = pt.ptRecord.filter(
      (record) => record.attended === "ATTENDED"
    ).length;

    // 다음 예정된 수업 찾기
    const upcomingSession = pt.ptRecord.find(
      (record) =>
        record.attended === "RESERVED" &&
        new Date(record.ptSchedule.date) >= new Date()
    );

    return {
      ...pt,
      startDate: pt.startDate.toISOString(),
      createdAt: pt.createdAt.toISOString(),
      completedCount,
      upcomingSession: upcomingSession
        ? {
            date: upcomingSession.ptSchedule.date.toISOString(),
            startTime: upcomingSession.ptSchedule.startTime,
          }
        : null,
      // 상태별 분류를 위한 계산된 필드들
      isPending: pt.state === PtState.PENDING,
      isConfirmed: pt.state === PtState.CONFIRMED,
      isCompleted:
        pt.state === PtState.CONFIRMED &&
        completedCount >= pt.ptProduct.totalCount,
    };
  });
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

  // 진행중인 PT 개수
  const activePts = await prisma.pt.count({
    where: {
      memberId,
      state: PtState.CONFIRMED,
    },
  });

  // 총 운동 횟수
  const totalSessions = await prisma.ptRecord.count({
    where: {
      pt: {
        memberId,
        state: PtState.CONFIRMED,
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
      },
      attended: "ATTENDED",
      ptSchedule: {
        date: {
          gte: thisMonthStart,
        },
      },
    },
  });

  return {
    totalPts,
    pendingPts,
    activePts,
    totalSessions,
    thisMonthSessions,
  };
};

// 타입 정의
export type IMemberPtList = Awaited<ReturnType<typeof getMemberPtListService>>;
export type IMemberDashboardStats = Awaited<
  ReturnType<typeof getMemberDashboardStatsService>
>;
