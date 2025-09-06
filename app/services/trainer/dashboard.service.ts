import prisma from "@/app/lib/prisma";
import { PtState } from "@prisma/client";

// 서비스 함수 - 타입 추론 활용
export async function getTrainerDashboard(trainerId: string) {
  // 현재 날짜 정보
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 이번달 첫날과 마지막날
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  // 주간 정보를 위한 날짜 계산 (일요일 건너뛰기)
  const weekDates = [];
  
  // 오늘이 일요일인 경우 특별 처리
  if (today.getDay() === 0) {
    // 일요일인 경우: 금, 토, 일(오늘), 월, 화 표시
    for (let i = -2; i <= 2; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      weekDates.push(date);
    }
  } else {
    // 일요일이 아닌 경우: 과거 2일, 오늘, 미래 2일 (일요일 건너뛰기)
    let daysAdded = 0;
    let dayOffset = 0;
    
    // 과거 2일 추가 (일요일 건너뛰기)
    while (daysAdded < 2) {
      dayOffset--;
      const date = new Date(today);
      date.setDate(today.getDate() + dayOffset);
      if (date.getDay() !== 0) { // 일요일이 아니면
        weekDates.unshift(date);
        daysAdded++;
      }
    }
    
    // 오늘 추가
    weekDates.push(new Date(today));
    
    // 미래 2일 추가 (일요일 건너뛰기)
    daysAdded = 0;
    dayOffset = 0;
    while (daysAdded < 2) {
      dayOffset++;
      const date = new Date(today);
      date.setDate(today.getDate() + dayOffset);
      if (date.getDay() !== 0) { // 일요일이 아니면
        weekDates.push(date);
        daysAdded++;
      }
    }
  }

  // 주간 범위 (5일 기준)
  const weekStart = new Date(weekDates[0]);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekDates[weekDates.length - 1]);
  weekEnd.setHours(23, 59, 59, 999);

  // 병렬로 필요한 데이터 조회
  const [
    trainerData,
    activePtCount,
    pendingPtCount,
    newPts,
    closingSoonPts,
    nextLesson,
    weekLessons,
  ] = await Promise.all([
    // 1. 트레이너 정보
    prisma.trainer.findUnique({
      where: { id: trainerId },
      select: {
        id: true,
        user: {
          select: {
            username: true,
            avatarImageId: true,
            // 최적화: managerProfile은 존재 여부만 확인하므로 빈 select
            managerProfile: {
              select: {
                id: true,
              },
            },
          },
        },
        fitnessCenter: {
          select: {
            title: true,
          },
        },
      },
    }),

    // 2. 진행중인 PT 수
    prisma.pt.count({
      where: {
        trainerId,
        state: PtState.CONFIRMED,
      },
    }),

    // 3. 승인 대기 중인 PT 수
    prisma.pt.count({
      where: {
        trainerId,
        state: PtState.PENDING,
        startDate: {
          gt: now,
        },
      },
    }),

    // 4. 이번달 시작한 모든 PT (신규/재등록 구분을 위한 상세 데이터)
    prisma.pt.findMany({
      where: {
        trainerId,
        startDate: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
      select: {
        // 최적화: id와 memberId 제거 (사용하지 않음)
        member: {
          select: {
            // 지난달과 이번달의 lesson이 있는지 확인
            _count: {
              select: {
                pt: {
                  where: {
                    trainerId,
                    startDate: {
                      gte: new Date(
                        today.getFullYear(),
                        today.getMonth() - 1,
                        1
                      ), // 지난달 첫날
                      lt: firstDayOfMonth, // 이번달 첫날 전까지
                    },
                    lessons: {
                      some: {
                        scheduledAt: {
                          gte: new Date(
                            today.getFullYear(),
                            today.getMonth() - 1,
                            1
                          ),
                          lte: lastDayOfMonth,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),

    // 5. 종료 임박 PT (남은 수업 2개 이하)
    prisma.pt.findMany({
      where: {
        trainerId,
        state: PtState.CONFIRMED,
      },
      select: {
        // 최적화: id 제거 (사용하지 않음)
        ptProduct: {
          select: {
            totalCount: true,
          },
        },
        lessons: {
          where: {
            // 완료된 레슨: records가 있고 삭제되지 않은 것
            records: {
              some: {
                deletedAt: null,
              },
            },
          },
          select: {
            // 최적화: lessons 배열의 길이만 필요하므로 최소한의 필드만 선택
            id: true,
          },
        },
      },
    }),

    // 6. 가장 가까운 미래 레슨 1개
    prisma.lesson.findFirst({
      where: {
        pt: {
          trainerId,
        },
        scheduledAt: {
          gt: now, // 현재 시점 이후
        },
      },
      select: {
        id: true,
        scheduledAt: true,
        endAt: true,
        pt: {
          select: {
            id: true,
            member: {
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
                totalCount: true,
              },
            },
            lessons: {
              where: {
                // 완료된 레슨: records가 있고 삭제되지 않은 것
                records: {
                  some: {
                    deletedAt: null,
                  },
                },
              },
              select: {
                // 최적화: lessons 배열의 길이만 필요하므로 최소한의 필드만 선택
                id: true,
              },
            },
          },
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
    }),

    // 7. 주간 레슨들 (5일 기준)
    prisma.lesson.findMany({
      where: {
        pt: {
          trainerId,
        },
        scheduledAt: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      select: {
        id: true,
        scheduledAt: true,
        records: {
          select: {
            deletedAt: true,
          },
        },
      },
    }),
  ]);

  // 트레이너 데이터가 없으면 에러
  if (!trainerData) {
    throw new Error("Trainer not found");
  }

  // 신규/재등록 구분
  let newRegistrationCount = 0;
  let reRegistrationCount = 0;

  newPts.forEach((pt) => {
    // 지난달에 해당 회원과의 PT가 있었는지 확인
    if (pt.member && pt.member._count.pt > 0) {
      reRegistrationCount++;
    } else {
      newRegistrationCount++;
    }
  });

  // 종료 임박 PT 계산 (남은 수업 2개 이하)
  const closingSoonCount = closingSoonPts.filter((pt) => {
    const completedLessons = pt.lessons.length;
    const remainingLessons = pt.ptProduct.totalCount - completedLessons;
    return remainingLessons > 0 && remainingLessons <= 2;
  }).length;

  // 가장 가까운 레슨 정보 처리
  let todayPtCard = null;
  if (nextLesson) {
    const timeDiff = nextLesson.scheduledAt.getTime() - now.getTime();
    const hoursRemaining = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutesRemaining = Math.floor(
      (timeDiff % (1000 * 60 * 60)) / (1000 * 60)
    );

    const completedCount = nextLesson.pt.lessons.length;
    const remainingCount = nextLesson.pt.ptProduct.totalCount - completedCount;

    // 수업 시간 계산 (분 단위)
    const durationMinutes = Math.floor(
      (nextLesson.endAt.getTime() - nextLesson.scheduledAt.getTime()) / (1000 * 60)
    );

    todayPtCard = {
      id: nextLesson.id,
      ptId: nextLesson.pt.id,
      memberName: nextLesson.pt.member?.user.username || "알 수 없음",
      scheduledAt: nextLesson.scheduledAt,
      endAt: nextLesson.endAt,
      duration: durationMinutes, // 호환성을 위해 계산된 duration 유지
      ptTitle: nextLesson.pt.ptProduct.title,
      remainingCount,
      timeRemaining: {
        hours: hoursRemaining,
        minutes: minutesRemaining,
        text:
          hoursRemaining > 0
            ? `${hoursRemaining}시간 ${minutesRemaining}분 후`
            : `${minutesRemaining}분 후`,
      },
    };
  }

  // 주간 스케줄 생성 (5일 기준, 일요일 건너뛰기)
  type DaySchedule = {
    day: string;
    date: number;
    month: number;
    isToday: boolean;
    isPast: boolean;
    isFuture: boolean;
    isSunday: boolean;
    counts: {
      scheduled: number;
      completed: number;
      absent: number;
      cancelled: number;
    };
  };

  const weeklySchedule: DaySchedule[] = [];
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

  weekDates.forEach((date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const dayLessons = weekLessons.filter((lesson) => {
      return lesson.scheduledAt >= dayStart && lesson.scheduledAt <= dayEnd;
    });

    const isToday = date.toDateString() === today.toDateString();
    const isPast = date < today;
    const isFuture = date > today;
    const isSunday = date.getDay() === 0;

    // 일요일이고 오늘인 경우 특별 처리
    if (isSunday && isToday) {
      const daySchedule = {
        day: "일",
        date: date.getDate(),
        month: date.getMonth() + 1,
        isToday: true,
        isPast: false,
        isFuture: false,
        isSunday: true,
        counts: {
          scheduled: 0,
          completed: 0,
          absent: 0,
          cancelled: 0,
        },
      };
      weeklySchedule.push(daySchedule);
      return; // forEach의 continue 역할
    }

    // Lesson 상태 판단 (records 기반)
    let scheduled = 0;
    let completed = 0;
    let absent = 0;
    const cancelled = 0; // 현재 스키마에 취소 상태가 없으므로 0으로 고정

    dayLessons.forEach((lesson) => {
      const hasRecords = lesson.records.length > 0;
      const hasValidRecords = lesson.records.some((r) => r.deletedAt === null);
      const lessonTime = lesson.scheduledAt;
      const isLessonPast = lessonTime < now;

      if (hasValidRecords) {
        // records가 있고 삭제되지 않은 경우 = 완료
        completed++;
      } else if (isLessonPast && !hasRecords) {
        // 과거 시점인데 records가 없는 경우 = 불참
        absent++;
      } else if (!isLessonPast) {
        // 미래 시점 = 예정
        scheduled++;
      }
    });

    const daySchedule = {
      day: dayNames[date.getDay()],
      date: date.getDate(),
      month: date.getMonth() + 1,
      isToday,
      isPast,
      isFuture,
      isSunday: false,
      counts: {
        scheduled: isFuture ? scheduled : isToday ? scheduled : 0,
        completed: isPast || isToday ? completed : 0,
        absent: isPast || isToday ? absent : 0,
        cancelled: cancelled, // 모든 날짜에서 표시
      },
    };

    weeklySchedule.push(daySchedule);
  });

  // 결과 반환
  return {
    trainer: {
      id: trainerData.id,
      name: trainerData.user.username,
      profileImage: trainerData.user.avatarImageId || undefined,
      centerName: trainerData.fitnessCenter?.title || "센터 미지정",
      hasManagerProfile: !!trainerData.user.managerProfile,
    },
    todayPtCard, // 가장 가까운 미래 레슨 1개
    pendingPtCount, // 승인 대기 중인 PT 수
    ptStatus: {
      active: activePtCount, // 진행중
      newRegistration: newRegistrationCount, // 신규 등록
      reRegistration: reRegistrationCount, // 재등록
      closingSoon: closingSoonCount, // 종료 임박 (2회 이하)
    },
    weeklySchedule, // 5일간 일정 (일요일 제외)
  };
}

// 타입 추론
export type GetTrainerDashboardResult = Awaited<
  ReturnType<typeof getTrainerDashboard>
>;
