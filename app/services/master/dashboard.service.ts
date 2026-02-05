import prisma from "@/app/lib/prisma";
import { getKSTMonthStart, getKSTMonthEnd } from "@/app/lib/utils/time.utils";

// 모든 센터 목록 조회
export async function getAllCenters(masterId: string) {
  try {
    const master = await prisma.master.findUnique({
      where: {
        id: masterId,
      },
      select: {
        id: true,
      },
    });

    if (!master) {
      return {
        centers: [],
      };
    }

    const centers = await prisma.fitnessCenter.findMany({
      select: {
        id: true,
        title: true,
        address: true,
        inOperation: true,
      },
      orderBy: {
        title: "asc",
      },
    });

    return {
      centers,
    };
  } catch (error) {
    console.error("Get manager centers error:", error);
    throw error;
  }
}

// PENDING 상태인 TrainerOff 개수 조회
export async function getPendingTrainerOffCount(managerId: string) {
  try {
    const trainerOffs = await prisma.trainerOff.findMany({
      where: {
        state: "PENDING",
      },
      select: {
        id: true,
        trainer: {
          select: {
            fitnessCenter: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    // 센터별로 그룹화
    const centerStats: { [key: string]: { title: string; count: number } } = {};

    trainerOffs.forEach((trainerOff) => {
      const fitnessCenter = trainerOff.trainer.fitnessCenter;
      if (!fitnessCenter) return;

      const centerId = fitnessCenter.id;
      const centerTitle = fitnessCenter.title;

      if (!centerStats[centerId]) {
        centerStats[centerId] = { title: centerTitle, count: 0 };
      }
      centerStats[centerId].count++;
    });

    return centerStats;
  } catch (error) {
    console.error("Get pending trainer off count error:", error);
    throw error;
  }
}

// 취소되었지만 마스터가 확인하지 않은 레슨 취소건수
export async function getUncheckedCanceledLessonsCount(managerId: string) {
  try {
    const lessons = await prisma.lesson.findMany({
      where: {
        isCanceled: true,
        cancelInfo: { approvedAt: null },
      },
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

    // 센터별로 그룹화
    const centerStats: { [key: string]: { title: string; count: number } } = {};

    lessons.forEach((lesson) => {
      const centerId = lesson.fitnessCenter.id;
      const centerTitle = lesson.fitnessCenter.title;

      if (!centerStats[centerId]) {
        centerStats[centerId] = { title: centerTitle, count: 0 };
      }
      centerStats[centerId].count++;
    });

    return centerStats;
  } catch (error) {
    console.error("Get unchecked canceled lessons count error:", error);
    throw error;
  }
}

// 미승인된 PT 일시정지 개수 조회
export async function getUncheckedPtPausesCount(managerId: string) {
  try {
    const ptPauses = await prisma.ptPause.findMany({
      where: {
        isApproved: false, // 미승인
      },
      select: {
        id: true,
        pt: {
          select: {
            trainer: {
              select: {
                fitnessCenter: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 센터별로 그룹화
    const centerStats: { [key: string]: { title: string; count: number } } = {};

    ptPauses.forEach((ptPause) => {
      const trainer = ptPause.pt.trainer;
      if (!trainer) return;

      const fitnessCenter = trainer.fitnessCenter;
      if (!fitnessCenter) return;

      const centerId = fitnessCenter.id;
      const centerTitle = fitnessCenter.title;

      if (!centerStats[centerId]) {
        centerStats[centerId] = { title: centerTitle, count: 0 };
      }
      centerStats[centerId].count++;
    });

    return centerStats;
  } catch (error) {
    console.error("Get unchecked PT pauses count error:", error);
    throw error;
  }
}

// 미결제 PT 조회
export async function getUnpaidPtPayments(managerId: string) {
  try {
    // 미결제 PT Payment 조회
    const unpaidPayments = await prisma.ptPayment.findMany({
      where: {
        paidAt: null, // 미결제
        pt: {
          state: "CONFIRMED", // 확정된 PT만
        },
      },
      select: {
        id: true,
        pt: {
          select: {
            trainer: {
              select: {
                fitnessCenter: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 센터별로 그룹화
    const centerStats: { [key: string]: { title: string; count: number } } = {};

    unpaidPayments.forEach((payment) => {
      const trainer = payment.pt.trainer;
      if (!trainer) return;

      const fitnessCenter = trainer.fitnessCenter;
      if (!fitnessCenter) return;

      const centerId = fitnessCenter.id;
      const centerTitle = fitnessCenter.title;

      if (!centerStats[centerId]) {
        centerStats[centerId] = { title: centerTitle, count: 0 };
      }
      centerStats[centerId].count++;
    });

    return centerStats;
  } catch (error) {
    console.error("Get unpaid PT payments error:", error);
    throw error;
  }
}

export const getPts = async () => {
  const monthStart = getKSTMonthStart();
  const monthEnd = getKSTMonthEnd();
  const threeMonthsAgo = new Date(monthStart);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  // 1. 이번달 신규 생성된 PT (센터 정보 포함)
  const newPts = await prisma.pt.findMany({
    where: {
      createdAt: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    select: {
      id: true,
      trainerId: true,
      memberId: true,
      createdAt: true,
      trainer: {
        select: {
          fitnessCenterId: true,
        },
      },
    },
  });

  // 1-1. 재등록 PT 판별 (3개월 내 동일 trainer-member 조합으로 과거 레슨이 존재)
  const reRegisteredPtIds = new Set<string>();

  for (const pt of newPts) {
    // 동일한 trainer-member 조합으로 과거 3개월 내 레슨이 있는지 확인
    const pastLesson = await prisma.lesson.findFirst({
      where: {
        pt: {
          trainerId: pt.trainerId,
          memberId: pt.memberId,
          id: { not: pt.id }, // 현재 PT 제외
        },
        scheduledAt: {
          gte: threeMonthsAgo,
          lt: monthStart, // 이번달 이전
        },
      },
      select: {
        id: true,
      },
    });

    if (pastLesson) {
      reRegisteredPtIds.add(pt.id);
    }
  }

  // 2. 이번달 종료 예정 PT (센터 정보 포함)
  // 조건1: expirationDate가 이번달에 해당하는 PT
  const expiringByDatePts = await prisma.pt.findMany({
    where: {
      expirationDate: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    select: {
      id: true,
      trainer: {
        select: {
          fitnessCenterId: true,
        },
      },
    },
  });

  // 조건2: 취소되지 않은 레슨 수가 totalCount와 같고,
  // 가장 늦은 레슨의 scheduledAt이 이번달인 PT
  const allActivePts = await prisma.pt.findMany({
    where: {
      state: "CONFIRMED",
    },
    select: {
      id: true,
      trainer: {
        select: {
          fitnessCenterId: true,
        },
      },
      ptProduct: {
        select: {
          totalCount: true,
        },
      },
      lessons: {
        where: {
          isCanceled: false,
        },
        select: {
          scheduledAt: true,
        },
        orderBy: {
          scheduledAt: "desc",
        },
      },
    },
  });

  const expiringByLessonPts = allActivePts.filter((pt) => {
    const totalCount = pt.ptProduct.totalCount;
    const completedLessons = pt.lessons.length;

    if (completedLessons !== totalCount) return false;

    // 가장 늦은 레슨이 이번달인지 확인
    if (pt.lessons.length === 0) return false;

    const lastLesson = pt.lessons[0]; // 이미 desc로 정렬됨
    const lastLessonDate = new Date(lastLesson.scheduledAt);

    return lastLessonDate >= monthStart && lastLessonDate <= monthEnd;
  });

  // 센터별로 데이터 그룹화
  const centerStats: {
    [key: string]: {
      newCount: number;
      reRegisteredCount: number;
      endingSoonCount: number;
    };
  } = {};

  // 신규 PT를 센터별로 분류
  newPts.forEach((pt) => {
    if (!pt.trainer) return;
    const centerId = pt.trainer.fitnessCenterId;
    if (!centerId) return;

    if (!centerStats[centerId]) {
      centerStats[centerId] = {
        newCount: 0,
        reRegisteredCount: 0,
        endingSoonCount: 0,
      };
    }

    if (reRegisteredPtIds.has(pt.id)) {
      centerStats[centerId].reRegisteredCount++;
    } else {
      centerStats[centerId].newCount++;
    }
  });

  // 종료 예정 PT를 센터별로 분류 (중복 제거)
  const endingSoonPtsByCenterId: { [key: string]: Set<string> } = {};

  expiringByDatePts.forEach((pt) => {
    if (!pt.trainer) return;
    const centerId = pt.trainer.fitnessCenterId;
    if (!centerId) return;

    if (!endingSoonPtsByCenterId[centerId]) {
      endingSoonPtsByCenterId[centerId] = new Set();
    }
    endingSoonPtsByCenterId[centerId].add(pt.id);
  });

  expiringByLessonPts.forEach((pt) => {
    if (!pt.trainer) return;
    const centerId = pt.trainer.fitnessCenterId;
    if (!centerId) return;

    if (!endingSoonPtsByCenterId[centerId]) {
      endingSoonPtsByCenterId[centerId] = new Set();
    }
    endingSoonPtsByCenterId[centerId].add(pt.id);
  });

  // endingSoonCount 설정
  Object.keys(endingSoonPtsByCenterId).forEach((centerId) => {
    if (!centerStats[centerId]) {
      centerStats[centerId] = {
        newCount: 0,
        reRegisteredCount: 0,
        endingSoonCount: 0,
      };
    }
    centerStats[centerId].endingSoonCount =
      endingSoonPtsByCenterId[centerId].size;
  });

  return centerStats;
};

// 타입 추론

export type IAllCenters = Awaited<ReturnType<typeof getAllCenters>>;
export type GetPendingTrainerOffCountResult = Awaited<
  ReturnType<typeof getPendingTrainerOffCount>
>;
export type GetUncheckedCanceledLessonsCountResult = Awaited<
  ReturnType<typeof getUncheckedCanceledLessonsCount>
>;
export type GetUncheckedPtPausesCountResult = Awaited<
  ReturnType<typeof getUncheckedPtPausesCount>
>;
export type GetUnpaidPtPaymentsResult = Awaited<
  ReturnType<typeof getUnpaidPtPayments>
>;
export type IMasterDashboardPts = Awaited<ReturnType<typeof getPts>>;
