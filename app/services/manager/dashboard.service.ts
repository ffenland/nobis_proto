import prisma from "@/app/lib/prisma";
import { PtState } from "@prisma/client";

// PT 데이터: 이번달 PT 관련 주요 통계 (가장 중요한 정보)
export async function getManagerDashboardPT(managerId: string) {
  if (!managerId) {
    throw new Error("Manager ID is required");
  }

  // 매니저 정보 조회 (헤더용)
  const managerData = await prisma.manager.findUnique({
    where: { id: managerId },
    select: {
      id: true,
      user: {
        select: {
          username: true,
          avatarImageId: true,
        },
      },
    },
  });

  if (!managerData) {
    throw new Error("Manager not found");
  }

  // 날짜 계산
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  lastDayOfMonth.setHours(23, 59, 59, 999);

  // 먼저 단순한 쿼리들을 실행
  const [
    newPtThisMonth,
    allConfirmedPts,
    finishedPtThisMonth
  ] = await Promise.all([
    // 1. 이번달 신규 생성된 PT 수 (전체)
    prisma.pt.count({
      where: {
        state: PtState.CONFIRMED,
        createdAt: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
    }),

    // 3. 종료 임박 PT 계산용 - 모든 활성 PT 조회
    prisma.pt.findMany({
      where: {
        state: PtState.CONFIRMED,
      },
      select: {
        id: true,
        ptProduct: {
          select: {
            totalCount: true,
          },
        },
        _count: {
          select: {
            lessons: {
              where: {
                records: {
                  some: {
                    deletedAt: null,
                  },
                },
              },
            },
          },
        },
      },
    }),

    // 4. 이번달 종료된 PT 수
    prisma.pt.count({
      where: {
        state: PtState.FINISHED,
        updatedAt: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
    }),
  ]);

  // 2. 재등록 PT 계산 (복잡한 로직이므로 별도 처리)
  const thisMonthPts = await prisma.pt.findMany({
    where: {
      state: PtState.CONFIRMED,
      createdAt: {
        gte: firstDayOfMonth,
        lte: lastDayOfMonth,
      },
    },
    select: {
      id: true,
      memberId: true,
    },
  });

  // 재등록 PT 개수 계산
  let renewedPtThisMonth = 0;
  if (thisMonthPts.length > 0) {
    const memberIds = thisMonthPts.map(pt => pt.memberId).filter(Boolean) as string[];
    
    if (memberIds.length > 0) {
      const membersWithPreviousPts = await prisma.pt.groupBy({
        by: ['memberId'],
        where: {
          memberId: { in: memberIds },
          createdAt: { lt: firstDayOfMonth },
        },
        _count: { id: true },
      });

      renewedPtThisMonth = membersWithPreviousPts.length;
    }
  }

  // 3. 종료 임박 PT 계산
  const endingSoonPt = allConfirmedPts.filter(pt => {
    const remainingLessons = (pt.ptProduct?.totalCount || 0) - (pt._count?.lessons || 0);
    return remainingLessons > 0 && remainingLessons <= 3;
  }).length;

  // 4. 실제로 이번달에 재등록하지 않은 종료 PT 계산
  const finishedPtMembers = await prisma.pt.findMany({
    where: {
      state: PtState.FINISHED,
      updatedAt: {
        gte: firstDayOfMonth,
        lte: lastDayOfMonth,
      },
    },
    select: {
      memberId: true,
    },
  });

  let endedPtThisMonth = finishedPtThisMonth;
  if (finishedPtMembers.length > 0) {
    const finishedMemberIds = finishedPtMembers.map(pt => pt.memberId).filter(Boolean) as string[];
    
    if (finishedMemberIds.length > 0) {
      const reRegisteredCount = await prisma.pt.count({
        where: {
          memberId: { in: finishedMemberIds },
          state: PtState.CONFIRMED,
          createdAt: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth,
          },
        },
      });
      
      endedPtThisMonth = finishedPtThisMonth - reRegisteredCount;
    }
  }

  return {
    manager: {
      id: managerData.id,
      name: managerData.user.username,
      profileImage: managerData.user.avatarImageId || undefined,
    },
    ptStats: {
      newPtThisMonth,
      renewedPtThisMonth,
      endingSoonPt,
      endedPtThisMonth,
    },
  };
}



// Schedule 데이터: 오늘 레슨 + 주간 스케줄
export async function getManagerDashboardSchedule(managerId: string) {
  if (!managerId) {
    throw new Error("Manager ID is required");
  }

  // 날짜 계산
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 이번주 월요일-토요일 계산
  const monday = new Date(today);
  const day = monday.getDay();
  const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  saturday.setHours(23, 59, 59, 999);

  const [todayLessons, weekLessons] = await Promise.all([
    // 오늘 레슨
    prisma.lesson.findMany({
      where: {
        scheduledAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      select: {
        id: true,
        scheduledAt: true,
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
            ptProduct: {
              select: {
                title: true,
              },
            },
          },
        },
        records: {
          select: {
            id: true,
            deletedAt: true,
          },
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
    }),

    // 주간 레슨
    prisma.lesson.findMany({
      where: {
        scheduledAt: {
          gte: monday,
          lte: saturday,
        },
      },
      select: {
        id: true,
        scheduledAt: true,
        records: {
          select: {
            id: true,
            deletedAt: true,
          },
        },
      },
    }),
  ]);

  // 현재 시간
  const now = new Date();

  // 오늘 레슨 처리
  const todayStats = {
    completed: 0,
    absent: 0,
    upcoming: 0,
    inProgress: 0,
  };

  const upcomingLessons = [];

  for (const lesson of (todayLessons || [])) {
    if (!lesson?.scheduledAt) continue;
    
    const lessonEndTime = new Date(lesson.scheduledAt);
    lessonEndTime.setHours(lessonEndTime.getHours() + 1);

    if (lesson.scheduledAt > now) {
      // 예정된 레슨
      todayStats.upcoming++;
      upcomingLessons.push({
        id: lesson.id,
        time: lesson.scheduledAt,
        memberName: lesson.pt?.member?.user?.username || "알 수 없음",
        trainerName: lesson.pt?.trainer?.user?.username || "알 수 없음",
        ptTitle: lesson.pt?.ptProduct?.title || "제목 없음",
      });
    } else if (lesson.scheduledAt <= now && lessonEndTime > now) {
      // 진행 중인 레슨
      todayStats.inProgress++;
    } else {
      // 지난 레슨
      if (lesson.records?.some(r => !r.deletedAt)) {
        todayStats.completed++;
      } else {
        todayStats.absent++;
      }
    }
  }

  // 주간 스케줄 생성
  const weeklySchedule = [];
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

  for (let i = 0; i < 6; i++) {
    const currentDate = new Date(monday);
    currentDate.setDate(monday.getDate() + i);

    const dayLessons = (weekLessons || []).filter((lesson) => {
      return lesson?.scheduledAt && lesson.scheduledAt.toDateString() === currentDate.toDateString();
    });

    const isToday = currentDate.toDateString() === today.toDateString();
    const isPast = currentDate < today;

    let completed = 0;
    let absent = 0;
    let scheduled = 0;
    let inProgress = 0;

    dayLessons.forEach((lesson) => {
      if (!lesson?.scheduledAt) return;
      
      const lessonEndTime = new Date(lesson.scheduledAt);
      lessonEndTime.setHours(lessonEndTime.getHours() + 1);

      if (isPast || (isToday && lesson.scheduledAt < now)) {
        if (lesson.records?.some((r) => !r.deletedAt)) {
          completed++;
        } else {
          absent++;
        }
      } else if (isToday && lesson.scheduledAt <= now && lessonEndTime > now) {
        inProgress++;
      } else {
        scheduled++;
      }
    });

    weeklySchedule.push({
      day: dayNames[currentDate.getDay()],
      date: currentDate.getDate().toString(),
      isToday,
      isPast,
      completed,
      absent,
      scheduled,
      inProgress,
      total: dayLessons.length,
    });
  }

  return {
    todayLessons: {
      stats: todayStats,
      upcoming: upcomingLessons,
    },
    weeklySchedule,
  };
}

// Centers 데이터: 센터별 트레이너 수 + 활성 PT 수
export async function getManagerDashboardCenters(managerId: string) {
  if (!managerId) {
    throw new Error("Manager ID is required");
  }

  const centerStats = await prisma.fitnessCenter.findMany({
    where: { inOperation: true },
    select: {
      id: true,
      title: true,
      _count: {
        select: {
          trainers: {
            where: { working: true },
          },
        },
      },
    },
    orderBy: {
      title: "asc",
    },
  });

  // 각 센터별 활성 PT 수를 별도로 조회
  const centerOverview = await Promise.all(
    centerStats.map(async (center) => {
      const activePtCount = await prisma.pt.count({
        where: {
          state: PtState.CONFIRMED,
          trainer: {
            fitnessCenterId: center.id,
          },
        },
      });

      return {
        id: center.id,
        title: center.title,
        trainerCount: center._count.trainers,
        activePtCount,
      };
    })
  );

  return {
    centerOverview,
  };
}


// 타입 정의
export type GetManagerDashboardPTResult = Awaited<ReturnType<typeof getManagerDashboardPT>>;
export type GetManagerDashboardScheduleResult = Awaited<ReturnType<typeof getManagerDashboardSchedule>>;
export type GetManagerDashboardCentersResult = Awaited<ReturnType<typeof getManagerDashboardCenters>>;