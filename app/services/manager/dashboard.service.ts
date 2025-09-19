import prisma from "@/app/lib/prisma";

// 오늘의 레슨 조회 (매니저가 관리하는 모든 센터의 레슨)
export async function getTodayLessons(managerId: string) {
  try {
    // 현재 날짜 정보
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 매니저가 관리하는 센터들의 오늘 레슨 조회
    const todayLessons = await prisma.lesson.findMany({
      where: {
        scheduledAt: {
          gte: today,
          lt: tomorrow,
        },
        isCanceled: false, // 취소되지 않은 레슨만
        fitnessCenter: {
          managers: {
            some: {
              id: managerId, // 매니저가 관리하는 센터만
            },
          },
        },
      },
      select: {
        id: true,
        scheduledAt: true,
        endAt: true,
        pt: {
          select: {
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
        fitnessCenter: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            records: {
              where: {
                deletedAt: null, // 삭제되지 않은 기록만
              },
            },
          },
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
    });

    return {
      lessons: todayLessons.map((lesson) => ({
        id: lesson.id,
        scheduledAt: lesson.scheduledAt,
        endAt: lesson.endAt,
        trainerName: lesson.pt.trainer?.user.username || "알 수 없음",
        fitnessCenterId: lesson.fitnessCenter.id,
        fitnessCenterTitle: lesson.fitnessCenter.title,
        recordsCount: lesson._count.records,
      })),
    };
  } catch (error) {
    console.error("Get today lessons error:", error);
    throw error;
  }
}

// 주간 레슨 갯수 조회 (오늘부터 미래 5일간, 일요일 제외)
export async function getWeeklyLessonsCount(managerId: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 미래 5일간의 날짜 계산 (일요일 건너뛰기)
    const weekDates = [];
    const currentDate = new Date(today);

    while (weekDates.length < 5) {
      // 일요일이 아니면 추가
      if (currentDate.getDay() !== 0) {
        weekDates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 각 날짜별 레슨 갯수 조회
    const weeklyStats = await Promise.all(
      weekDates.map(async (date) => {
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);

        const dayLessons = await prisma.lesson.findMany({
          where: {
            scheduledAt: {
              gte: date,
              lt: nextDay,
            },
            isCanceled: false, // 취소되지 않은 레슨만
            fitnessCenter: {
              managers: {
                some: {
                  id: managerId, // 매니저가 관리하는 센터만
                },
              },
            },
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

        const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

        return {
          date: date.getDate(),
          month: date.getMonth() + 1,
          day: dayNames[date.getDay()],
          isToday: date.toDateString() === today.toDateString(),
          lessonCount: dayLessons.length,
          lessons: dayLessons.map((lesson) => ({
            id: lesson.id,
            fitnessCenterId: lesson.fitnessCenter.id,
            fitnessCenterTitle: lesson.fitnessCenter.title,
          })),
        };
      })
    );

    return {
      weeklyStats,
    };
  } catch (error) {
    console.error("Get weekly lessons count error:", error);
    throw error;
  }
}

// PT 현황 조회 (종료 예정, 신규 등록, 재등록)
export async function getPtStats(managerId: string) {
  try {
    // 현재 날짜 정보
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 이번달 첫날과 마지막날
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    );
    lastDayOfMonth.setHours(23, 59, 59, 999);

    // 15일 후 날짜 (종료 예정 PT 판단용)
    const fifteenDaysLater = new Date(now);
    fifteenDaysLater.setDate(now.getDate() + 15);

    // 과거 1개월 범위 (재등록 PT 판단용)
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    // 매니저가 관리하는 센터의 모든 PT 조회
    const allPts = await prisma.pt.findMany({
      where: {
        trainer: {
          fitnessCenter: {
            managers: {
              some: {
                id: managerId, // 매니저가 관리하는 센터의 트레이너만
              },
            },
          },
        },
        state: "CONFIRMED", // 확정된 PT만
      },
      select: {
        id: true,
        stateUpdatedAt: true,
        expirationDate: true,
        memberId: true,
        member: {
          select: {
            user: {
              select: {
                username: true,
              },
            },
          },
        },
        trainerId: true,
        trainer: {
          select: {
            id: true,
            user: {
              select: {
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
        lessons: {
          where: {
            isCanceled: false, // 취소되지 않은 레슨만
            scheduledAt: {
              lt: fifteenDaysLater, // 15일 이내의 레슨만 (종료 예정 판단용)
            },
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

    // 1. 종료 예정 PT (expirationDate가 이번달 + 잔여 레슨 3개 이하)
    const endingSoonPts = allPts.filter((pt) => {
      const isExpiringThisMonth =
        pt.expirationDate &&
        pt.expirationDate >= firstDayOfMonth &&
        pt.expirationDate <= lastDayOfMonth;

      const completedLessons = pt.lessons.filter(
        (lesson) => lesson.scheduledAt < now
      ).length;
      const remainingLessons = pt.ptProduct.totalCount - completedLessons;

      return (
        isExpiringThisMonth || (remainingLessons > 0 && remainingLessons <= 3)
      );
    });

    // 이번달에 state가 변경된 PT들 (신규/재등록 판단용)
    const thisMonthPts = allPts.filter(
      (pt) =>
        pt.stateUpdatedAt &&
        pt.stateUpdatedAt >= firstDayOfMonth &&
        pt.stateUpdatedAt <= lastDayOfMonth
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
              lt: now,
            },
            id: {
              not: pt.id, // 현재 PT 제외
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

    // 결과 포맷팅
    const formatPtList = (pts: typeof allPts) =>
      pts.map((pt) => ({
        id: pt.id,
        trainerId: pt.trainer?.id,
        trainerName: pt.trainer?.user.username,
        memberName: pt.member?.user.username,
        fitnessCenterId: pt.trainer?.fitnessCenter?.id,
        fitnessCenterTitle: pt.trainer?.fitnessCenter?.title,
        nearestLessonAt:
          pt.lessons.length > 0 ? pt.lessons[0].scheduledAt : null,
      }));

    // 센터별 통계 계산 함수
    const calculateCenterStats = (pts: typeof allPts) => {
      const centerStats: { [key: string]: { title: string; count: number } } = {};
      
      pts.forEach((pt) => {
        const centerId = pt.trainer?.fitnessCenter?.id;
        const centerTitle = pt.trainer?.fitnessCenter?.title;
        
        if (centerId && centerTitle) {
          if (!centerStats[centerId]) {
            centerStats[centerId] = { title: centerTitle, count: 0 };
          }
          centerStats[centerId].count++;
        }
      });
      
      return centerStats;
    };

    return {
      endingSoonPts: {
        count: endingSoonPts.length,
        pts: formatPtList(endingSoonPts),
        centerStats: calculateCenterStats(endingSoonPts),
      },
      newPts: {
        count: newPts.length,
        pts: formatPtList(newPts),
        centerStats: calculateCenterStats(newPts),
      },
      reRegisteredPts: {
        count: reRegisteredPts.length,
        pts: formatPtList(reRegisteredPts),
        centerStats: calculateCenterStats(reRegisteredPts),
      },
    };
  } catch (error) {
    console.error("Get PT stats error:", error);
    throw error;
  }
}

// 매니저가 관리하는 센터 목록 조회
export async function getManagerCenters(managerId: string) {
  try {
    const centers = await prisma.fitnessCenter.findMany({
      where: {
        managers: {
          some: {
            id: managerId, // 매니저가 관리하는 센터만
          },
        },
      },
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

// 타입 추론
export type GetTodayLessonsResult = Awaited<ReturnType<typeof getTodayLessons>>;
export type GetWeeklyLessonsCountResult = Awaited<
  ReturnType<typeof getWeeklyLessonsCount>
>;
export type GetPtStatsResult = Awaited<ReturnType<typeof getPtStats>>;
export type GetManagerCentersResult = Awaited<ReturnType<typeof getManagerCenters>>;
