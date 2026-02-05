import prisma from "@/app/lib/prisma";
import {
  getKSTMonthStart,
  getKSTMonthEnd,
  parseYYYYMM,
} from "@/app/lib/utils/time.utils";

// Master 권한 검증
async function validateMasterAccess(masterId: string) {
  const master = await prisma.master.findUnique({
    where: { id: masterId },
    select: { id: true },
  });

  if (!master) {
    throw new Error("Master not found");
  }
}

/**
 * 월간 통계 데이터 조회
 * @param masterId - Master ID
 * @param date - YYYYMM 형식의 날짜 문자열 (optional)
 * @returns 트레이너별 수입, 휴무, PT 현황 통계
 */
export async function getMonthlyStats(masterId: string, date?: string) {
  await validateMasterAccess(masterId);

  // 날짜 범위 설정
  let startDate: Date;
  let endDate: Date;

  if (date) {
    // YYYYMM 파싱
    const { year, month } = parseYYYYMM(date);
    const targetDate = new Date(year, month - 1, 1);
    startDate = getKSTMonthStart(targetDate);

    // 현재 월인지 확인
    const now = new Date();
    const isCurrentMonth =
      now.getFullYear() === year && now.getMonth() === month - 1;

    if (isCurrentMonth) {
      // 현재 월이면 현재 시간 - 1시간
      endDate = new Date(now.getTime() - 60 * 60 * 1000);
    } else {
      // 지난 월이면 월 마지막날
      endDate = getKSTMonthEnd(targetDate);
    }
  } else {
    // 날짜가 없으면 현재 월
    const now = new Date();
    startDate = getKSTMonthStart(now);
    endDate = new Date(now.getTime() - 60 * 60 * 1000);
  }

  // 1. 트레이너별 총 레슨 비용 계산
  const trainerRevenue = await calculateTrainerRevenue(startDate, endDate);

  // 2. 트레이너 휴무 통계
  const trainerOffs = await calculateTrainerOffs(startDate, endDate);

  // 3. PT 현황 통계
  const ptStats = await calculatePtStats(startDate, endDate);

  return {
    trainerRevenue,
    trainerOffs,
    ptStats,
  };
}

/**
 * 트레이너별 레슨 수입 계산
 */
async function calculateTrainerRevenue(startDate: Date, endDate: Date) {
  // PT 모델에서 시작하여 중복 쿼리 방지
  const pts = await prisma.pt.findMany({
    where: {
      state: "CONFIRMED",
      lessons: {
        some: {
          scheduledAt: { gte: startDate, lte: endDate },
          isCanceled: false,
        },
      },
    },
    select: {
      id: true,
      trainerId: true,
      trainer: {
        select: {
          user: {
            select: {
              realname: true,
              username: true,
            },
          },
          fitnessCenter: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
      ptProduct: {
        select: {
          totalCount: true,
        },
      },
      payment: {
        select: {
          amount: true,
          paidAt: true,
        },
      },
      lessons: {
        where: {
          scheduledAt: { gte: startDate, lte: endDate },
          isCanceled: false,
        },
        select: {
          id: true,
          _count: {
            select: {
              records: true,
            },
          },
        },
      },
    },
  });

  // 센터별 -> 트레이너별로 그룹화
  const revenueByCenterAndTrainer: {
    [centerId: string]: {
      centerTitle: string;
      trainers: {
        [trainerId: string]: {
          trainerName: string;
          totalRevenue: number;
          lessonCount: number;
        };
      };
    };
  } = {};

  pts.forEach((pt) => {
    if (!pt.trainer || !pt.payment) return;

    // fitnessCenter가 null이면 "소속없음" 처리
    const centerId = pt.trainer.fitnessCenter?.id || "noid";
    const centerTitle = pt.trainer.fitnessCenter?.title || "소속없음";
    const trainerId = pt.trainerId!;
    const trainerName = pt.trainer.user.realname || pt.trainer.user.username;

    // 레슨 단가 계산
    const pricePerLesson = pt.payment.amount / pt.ptProduct.totalCount;
    const lessonCount = pt.lessons.length;
    const revenue = pricePerLesson * lessonCount;

    // 센터 초기화
    if (!revenueByCenterAndTrainer[centerId]) {
      revenueByCenterAndTrainer[centerId] = {
        centerTitle,
        trainers: {},
      };
    }

    // 트레이너 초기화
    if (!revenueByCenterAndTrainer[centerId].trainers[trainerId]) {
      revenueByCenterAndTrainer[centerId].trainers[trainerId] = {
        trainerName,
        totalRevenue: 0,
        lessonCount: 0,
      };
    }

    // 누적
    revenueByCenterAndTrainer[centerId].trainers[trainerId].totalRevenue +=
      revenue;
    revenueByCenterAndTrainer[centerId].trainers[trainerId].lessonCount +=
      lessonCount;
  });

  return revenueByCenterAndTrainer;
}

/**
 * 트레이너 휴무 통계 계산
 */
async function calculateTrainerOffs(startDate: Date, endDate: Date) {
  const trainerOffs = await prisma.trainerOff.findMany({
    where: {
      masterId: { not: null }, // 승인된 휴무만
      OR: [
        { startAt: { gte: startDate, lte: endDate } },
        { endAt: { gte: startDate, lte: endDate } },
        {
          AND: [{ startAt: { lte: startDate } }, { endAt: { gte: endDate } }],
        },
      ],
    },
    select: {
      startAt: true,
      endAt: true,
      trainerId: true,
      trainer: {
        select: {
          user: {
            select: {
              realname: true,
              username: true,
            },
          },
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

  // 센터별 -> 트레이너별로 그룹화
  const offsByCenterAndTrainer: {
    [centerId: string]: {
      centerTitle: string;
      trainers: {
        [trainerId: string]: {
          trainerName: string;
          fullDayOff: number; // 연차 일수
          halfDayOff: number; // 반차 횟수
        };
      };
    };
  } = {};

  trainerOffs.forEach((off) => {
    // fitnessCenter가 null이면 "소속없음" 처리
    const centerId = off.trainer.fitnessCenter?.id || "noid";
    const centerTitle = off.trainer.fitnessCenter?.title || "소속없음";
    const trainerId = off.trainerId;
    const trainerName = off.trainer.user.realname || off.trainer.user.username;

    // 센터 초기화
    if (!offsByCenterAndTrainer[centerId]) {
      offsByCenterAndTrainer[centerId] = {
        centerTitle,
        trainers: {},
      };
    }

    // 트레이너 초기화
    if (!offsByCenterAndTrainer[centerId].trainers[trainerId]) {
      offsByCenterAndTrainer[centerId].trainers[trainerId] = {
        trainerName,
        fullDayOff: 0,
        halfDayOff: 0,
      };
    }

    // 휴무 유형 판별
    const offType = getOffType(off.startAt, off.endAt);

    // 겹치는 일수 계산
    const overlapDays = calculateOverlapDays(
      off.startAt,
      off.endAt,
      startDate,
      endDate
    );

    if (offType === "연차") {
      offsByCenterAndTrainer[centerId].trainers[trainerId].fullDayOff +=
        overlapDays;
    } else {
      // 반차
      offsByCenterAndTrainer[centerId].trainers[trainerId].halfDayOff += 1;
    }
  });

  return offsByCenterAndTrainer;
}

/**
 * 휴무 유형 판별 (연차, 오전반차, 오후반차)
 */
function getOffType(
  startAt: Date,
  endAt: Date
): "연차" | "오전반차" | "오후반차" {
  // KST 시간 추출
  const KST_OFFSET = 9 * 60 * 60 * 1000;
  const startKST = new Date(startAt.getTime() + KST_OFFSET);
  const endKST = new Date(endAt.getTime() + KST_OFFSET);

  const startHour = startKST.getUTCHours();
  const startMinute = startKST.getUTCMinutes();
  const endHour = endKST.getUTCHours();
  const endMinute = endKST.getUTCMinutes();

  const startTime = startHour * 100 + startMinute;
  const endTime = endHour * 100 + endMinute;

  // 같은 날인지 확인
  const isSameDay =
    startKST.getUTCFullYear() === endKST.getUTCFullYear() &&
    startKST.getUTCMonth() === endKST.getUTCMonth() &&
    startKST.getUTCDate() === endKST.getUTCDate();

  // 다른 날이면 연차
  if (!isSameDay) return "연차";

  // 00:00 ~ 23:59 = 연차
  if (startTime === 0 && endTime === 2359) return "연차";

  // 00:00 ~ 12:59 = 오전반차
  if (startTime === 0 && endTime === 1259) return "오전반차";

  // 13:00 ~ 23:59 = 오후반차
  if (startTime === 1300 && endTime === 2359) return "오후반차";

  // 기타는 연차로 처리
  return "연차";
}

/**
 * 두 기간의 겹치는 일수 계산
 */
function calculateOverlapDays(
  offStart: Date,
  offEnd: Date,
  rangeStart: Date,
  rangeEnd: Date
): number {
  const start = offStart > rangeStart ? offStart : rangeStart;
  const end = offEnd < rangeEnd ? offEnd : rangeEnd;

  if (start > end) return 0;

  // 밀리초 -> 일수 변환
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * PT 현황 통계 (신규/재등록/종료)
 */
async function calculatePtStats(startDate: Date, endDate: Date) {
  // 과거 1개월 범위 (재등록 PT 판단용)
  const oneMonthAgo = new Date(startDate);
  oneMonthAgo.setMonth(startDate.getMonth() - 1);

  // 모든 CONFIRMED PT 조회
  const allPts = await prisma.pt.findMany({
    where: {
      state: "CONFIRMED",
    },
    select: {
      id: true,
      stateUpdatedAt: true,
      expirationDate: true,
      memberId: true,
      trainerId: true,
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
          id: true,
          scheduledAt: true,
        },
        orderBy: {
          scheduledAt: "asc",
        },
      },
    },
  });

  // 1. 종료 예정 PT (expirationDate가 해당 월 또는 잔여 레슨 ≤ 3)
  const endingSoonPts = allPts.filter((pt) => {
    const isExpiringThisMonth =
      pt.expirationDate &&
      pt.expirationDate >= startDate &&
      pt.expirationDate <= endDate;

    const completedLessons = pt.lessons.filter(
      (lesson) => lesson.scheduledAt < endDate
    ).length;
    const remainingLessons = pt.ptProduct.totalCount - completedLessons;

    return (
      isExpiringThisMonth || (remainingLessons > 0 && remainingLessons <= 3)
    );
  });

  // 이번 기간에 state가 변경된 PT들 (신규/재등록 판단용)
  const thisMonthPts = allPts.filter(
    (pt) =>
      pt.stateUpdatedAt &&
      pt.stateUpdatedAt >= startDate &&
      pt.stateUpdatedAt <= endDate
  );

  // 재등록 PT 판단을 위한 과거 PT 조회
  const reRegistrationChecks = await Promise.all(
    thisMonthPts.map(async (pt) => {
      const pastPt = await prisma.pt.findFirst({
        where: {
          memberId: pt.memberId,
          trainerId: pt.trainerId,
          state: "FINISHED",
          expirationDate: {
            gte: oneMonthAgo,
            lt: endDate,
          },
          id: {
            not: pt.id,
          },
        },
        select: {
          id: true,
        },
      });

      return {
        pt,
        isReRegistration: !!pastPt,
      };
    })
  );

  // 2. 신규 등록 PT
  const newPts = reRegistrationChecks
    .filter((check) => !check.isReRegistration)
    .map((check) => check.pt);

  // 3. 재등록 PT
  const reRegisteredPts = reRegistrationChecks
    .filter((check) => check.isReRegistration)
    .map((check) => check.pt);

  // 센터별로 PT 데이터 그룹화
  const ptStatsByCenter: {
    [centerId: string]: {
      centerTitle: string;
      newPts: { count: number };
      reRegisteredPts: { count: number };
      endingSoonPts: { count: number };
    };
  } = {};

  // 센터 초기화 (모든 센터)
  allPts.forEach((pt) => {
    const centerId = pt.trainer?.fitnessCenter?.id;
    const centerTitle = pt.trainer?.fitnessCenter?.title;

    if (!centerId || !centerTitle) return;

    if (!ptStatsByCenter[centerId]) {
      ptStatsByCenter[centerId] = {
        centerTitle,
        newPts: { count: 0 },
        reRegisteredPts: { count: 0 },
        endingSoonPts: { count: 0 },
      };
    }
  });

  // 각 카테고리별 PT를 센터별로 집계
  const categorizePtsByCenter = (
    pts: typeof allPts,
    category: "endingSoonPts" | "newPts" | "reRegisteredPts"
  ) => {
    pts.forEach((pt) => {
      const centerId = pt.trainer?.fitnessCenter?.id;
      if (!centerId || !ptStatsByCenter[centerId]) return;

      ptStatsByCenter[centerId][category].count++;
    });
  };

  categorizePtsByCenter(endingSoonPts, "endingSoonPts");
  categorizePtsByCenter(newPts, "newPts");
  categorizePtsByCenter(reRegisteredPts, "reRegisteredPts");

  return ptStatsByCenter;
}

// 타입 추론
export type GetMonthlyStatsResult = Awaited<ReturnType<typeof getMonthlyStats>>;
