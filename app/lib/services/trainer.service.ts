// app/lib/services/trainer.service.ts
import prisma from "@/app/lib/prisma";

// 트레이너의 승인 대기 중인 PT 목록 조회
export const getPendingPtApplicationsService = async (trainerId: string) => {
  const pendingPts = await prisma.pt.findMany({
    where: {
      trainerId,
      trainerConfirmed: false, // 승인 대기 중
    },
    include: {
      member: {
        include: {
          user: {
            select: {
              username: true,
              phone: true,
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
      ptSchedule: {
        select: {
          date: true,
          startTime: true,
          endTime: true,
        },
        orderBy: {
          date: "asc",
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
      createdAt: "desc", // 최신 신청 순
    },
  });

  return pendingPts.map((pt) => ({
    ...pt,
    startDate: pt.startDate.toISOString(),
    createdAt: pt.createdAt.toISOString(),
    ptSchedule: pt.ptSchedule.map((schedule) => ({
      ...schedule,
      date: schedule.date.toISOString(),
    })),
  }));
};

// 트레이너의 모든 PT 목록 조회 (승인됨, 진행중, 완료)
export const getTrainerPtListService = async (trainerId: string) => {
  const allPts = await prisma.pt.findMany({
    where: {
      trainerId,
      trainerConfirmed: true, // 승인된 PT만
    },
    include: {
      member: {
        include: {
          user: {
            select: {
              username: true,
              phone: true,
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
        where: {
          attended: "ATTENDED",
        },
        select: {
          id: true,
        },
      },
      // 다음 예정된 수업 조회
      _ptRecord: {
        where: {
          attended: "RESERVED",
          ptSchedule: {
            date: {
              gte: new Date(),
            },
          },
        },
        select: {
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
        take: 1,
      },
    },
    orderBy: {
      startDate: "desc",
    },
  });

  return allPts.map((pt) => ({
    ...pt,
    startDate: pt.startDate.toISOString(),
    createdAt: pt.createdAt.toISOString(),
    completedCount: pt.ptRecord.length,
    nextSession: pt._ptRecord[0]?.ptSchedule
      ? {
          date: pt._ptRecord[0].ptSchedule.date.toISOString(),
          startTime: pt._ptRecord[0].ptSchedule.startTime,
        }
      : null,
  }));
};

// PT 승인 처리
export const approvePtApplicationService = async (
  ptId: string,
  trainerId: string
) => {
  // 1. PT가 해당 트레이너 것인지 확인
  const pt = await prisma.pt.findFirst({
    where: {
      id: ptId,
      trainerId,
      trainerConfirmed: false,
    },
  });

  if (!pt) {
    throw new Error("승인할 수 없는 PT 신청입니다.");
  }

  // 2. PT 승인 처리
  const approvedPt = await prisma.pt.update({
    where: { id: ptId },
    data: {
      trainerConfirmed: true,
      isActive: true,
      confirmedAt: new Date(),
    },
  });

  // 3. 모든 PT 스케줄에 대해 PT 기록 생성
  const ptSchedules = await prisma.ptSchedule.findMany({
    where: { ptId },
    orderBy: { date: "asc" },
  });

  const ptRecords = await Promise.all(
    ptSchedules.map((schedule) =>
      prisma.ptRecord.create({
        data: {
          ptId,
          ptScheduleId: schedule.id,
          attended: "RESERVED", // 초기값: 예약됨
        },
      })
    )
  );

  return {
    pt: approvedPt,
    recordsCreated: ptRecords.length,
  };
};

// PT 거절 처리
export const rejectPtApplicationService = async (
  ptId: string,
  trainerId: string,
  reason?: string
) => {
  // 1. PT가 해당 트레이너 것인지 확인
  const pt = await prisma.pt.findFirst({
    where: {
      id: ptId,
      trainerId,
      trainerConfirmed: false,
    },
  });

  if (!pt) {
    throw new Error("거절할 수 없는 PT 신청입니다.");
  }

  // 2. PT 거절 처리 (삭제)
  // 먼저 관련된 스케줄과 주간 시간 삭제
  await prisma.ptWeekTime.deleteMany({
    where: { ptId },
  });

  await prisma.ptSchedule.deleteMany({
    where: { ptId },
  });

  // PT 삭제
  const deletedPt = await prisma.pt.delete({
    where: { id: ptId },
  });

  // 거절 로그 저장 (선택적)
  if (reason) {
    await prisma.ptRejectionLog.create({
      data: {
        ptId: deletedPt.id,
        trainerId,
        memberId: deletedPt.memberId,
        reason,
        rejectedAt: new Date(),
      },
    });
  }

  return deletedPt;
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
      trainerConfirmed: false,
    },
  });

  // 진행 중인 PT 개수
  const activeCount = await prisma.pt.count({
    where: {
      trainerId,
      trainerConfirmed: true,
      isActive: true,
    },
  });

  // 오늘 수업 개수
  const todayClasses = await prisma.ptRecord.count({
    where: {
      pt: {
        trainerId,
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
