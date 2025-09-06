import prisma from "@/app/lib/prisma";
import { PtState } from "@prisma/client";

// === PT List 관련 서비스 ===

// 서비스 함수 - 데이터 가공 후 반환
export async function getTrainerPtList(trainerId: string) {
  // 현재 날짜와 3개월 전 날짜 계산
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  // CONFIRMED PT 조회
  const confirmedPts = await prisma.pt.findMany({
    where: {
      trainerId,
      state: PtState.CONFIRMED,
    },
    select: {
      id: true,
      state: true,
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
        select: {
          id: true,
          scheduledAt: true,
          endAt: true,
          records: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          scheduledAt: "desc",
        },
      },
    },
  });

  // FINISHED PT 조회 (최근 3개월 내 레슨이 있는 경우만)
  const finishedPts = await prisma.pt.findMany({
    where: {
      trainerId,
      state: PtState.FINISHED,
      lessons: {
        some: {
          scheduledAt: {
            gte: threeMonthsAgo,
          },
        },
      },
    },
    select: {
      id: true,
      state: true,
      member: {
        select: {
          user: {
            select: {
              username: true,
            },
          },
        },
      },
      lessons: {
        select: {
          scheduledAt: true,
        },
        orderBy: {
          scheduledAt: "desc",
        },
        take: 1, // 가장 최근 레슨만
      },
    },
  });

  // CONFIRMED PT 데이터 변환
  const confirmedPtsData = confirmedPts.map((pt) => {
    // 완료된 레슨 수 계산 (레코드가 있는 레슨)
    const completedSessions = pt.lessons.filter(
      (lesson) => lesson.records.length > 0
    ).length;
    const totalSessions = pt.ptProduct.totalCount;
    const remainingSessions = totalSessions - completedSessions;

    // 진행도 계산
    const progress = Math.round((completedSessions / totalSessions) * 100);

    // 상태 결정
    let status: "active" | "closing_soon";
    if (remainingSessions <= 3) {
      status = "closing_soon";
    } else {
      status = "active";
    }

    // 마지막 완료된 레슨 찾기
    const lastCompletedLesson = pt.lessons.find(
      (lesson) => lesson.records.length > 0
    );
    const lastSessionDate = lastCompletedLesson
      ? new Date(lastCompletedLesson.scheduledAt).toISOString().split("T")[0]
      : null;

    // 다음 예정된 레슨 찾기 (오늘 이후)
    const nextLesson = pt.lessons
      .filter(
        (lesson) => lesson.scheduledAt >= today && lesson.records.length === 0
      )
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      )[0];

    const nextSessionDate = nextLesson
      ? new Date(nextLesson.scheduledAt).toISOString().split("T")[0]
      : null;

    // scheduledAt에서 시간 추출 (HH:mm 형식)
    const nextSessionTime = nextLesson
      ? `${new Date(nextLesson.scheduledAt)
          .getHours()
          .toString()
          .padStart(2, "0")}:${new Date(nextLesson.scheduledAt)
          .getMinutes()
          .toString()
          .padStart(2, "0")}`
      : null;

    return {
      id: pt.id,
      state: pt.state,
      memberName: pt.member?.user.username || "알 수 없음",
      productName: pt.ptProduct.title,
      totalSessions,
      completedSessions,
      remainingSessions,
      progress,
      status,
      lastSessionDate,
      nextSessionDate,
      nextSessionTime,
      lessons: pt.lessons.map((lesson) => ({
        id: lesson.id,
        scheduledAt: lesson.scheduledAt,
        endAt: lesson.endAt,
        hasRecord: lesson.records.length > 0,
      })),
    };
  });

  // FINISHED PT 데이터 변환
  const finishedPtsData = finishedPts.map((pt) => {
    const lastLesson = pt.lessons[0]; // orderBy desc + take 1로 이미 가장 최근 레슨
    const lastSessionDate = lastLesson
      ? new Date(lastLesson.scheduledAt).toISOString().split("T")[0]
      : null;

    return {
      id: pt.id,
      state: pt.state,
      memberName: pt.member?.user.username || "알 수 없음",
      lastSessionDate,
      status: "completed" as const,
    };
  });

  // 모든 PT 데이터 병합
  const allPts = [...confirmedPtsData, ...finishedPtsData];

  // 통계 계산
  const stats = {
    total: allPts.length,
    active: confirmedPtsData.filter((pt) => pt.status === "active").length,
    closingSoon: confirmedPtsData.filter((pt) => pt.status === "closing_soon")
      .length,
    completed: finishedPtsData.length,
  };

  return {
    activePts: allPts,
    stats,
  };
}

// 타입 추론
export type GetTrainerPtListResult = Awaited<
  ReturnType<typeof getTrainerPtList>
>;

// ===== PT 상세 관련 함수 =====

// PT 상세 조회 서비스 함수
export async function getTrainerPtDetail(trainerId: string, ptId: string) {
  // 실제 Prisma 쿼리로 구현
  const pt = await prisma.pt.findUnique({
    where: {
      id: ptId,
      trainerId: trainerId,
    },
    select: {
      id: true,
      state: true,
      startDate: true,
      paymentAmount: true,
      description: true,
      goals: true, // PT 목표 가져오기
      member: {
        select: {
          user: {
            select: {
              username: true,
              email: true,
              mobile: true,
              avatarImageId: true,
            },
          },
        },
      },
      ptProduct: {
        select: {
          title: true,
          description: true,
          totalCount: true,
          time: true,
          price: true,
        },
      },
      lessons: {
        select: {
          id: true,
          memo: true,
          scheduledAt: true,
          endAt: true,
          records: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          scheduledAt: "asc",
        },
      },
    },
  });

  if (!pt) {
    return null;
  }

  // 현재 날짜
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 완료된 레슨과 불참 레슨 계산
  const completedLessons = pt.lessons.filter((l) => l.records.length > 0);
  const pastLessons = pt.lessons.filter((l) => {
    const lessonDate = new Date(l.scheduledAt);
    return lessonDate < today;
  });
  const absentLessons = pastLessons.filter((l) => l.records.length === 0);

  // 현재 레슨 번호 (완료된 레슨 수)
  const currentLesson = completedLessons.length;
  const remainingLessons = pt.ptProduct.totalCount - currentLesson;

  // PT 상태 결정
  let status: "active" | "closing_soon" | "completed" | "paused";
  if (pt.state === PtState.FINISHED || remainingLessons === 0) {
    status = "completed";
  } else if (remainingLessons <= 3) {
    status = "closing_soon";
  } else if (pt.state === PtState.REJECTED) {
    status = "paused";
  } else {
    status = "active";
  }

  // 만료일 계산 (시작일 + 3개월)
  const expiryDate = new Date(pt.startDate);
  expiryDate.setMonth(expiryDate.getMonth() + 3);

  // 다음 레슨 찾기
  const futureLessons = pt.lessons.filter((l) => {
    const lessonDate = new Date(l.scheduledAt);
    return lessonDate >= today && l.records.length === 0;
  });
  const nextLessonData = futureLessons.sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  )[0];

  const nextLesson = nextLessonData
    ? (() => {
        const nextLessonDate = new Date(nextLessonData.scheduledAt);
        const hours = nextLessonDate.getHours();
        const minutes = nextLessonDate.getMinutes();
        return {
          id: nextLessonData.id,
          date: nextLessonDate.toISOString().split("T")[0],
          time: hours * 100 + minutes, // HHMM 형식의 number로 변경
        };
      })()
    : null;

  // 레슨 데이터 변환
  const lessons = pt.lessons.map((lesson, index) => {
    const hasRecords = lesson.records.length > 0;
    const lessonDate = new Date(lesson.scheduledAt);
    const isPast = lessonDate < today;

    // 레슨 상태 결정
    let lessonStatus: "completed" | "absent" | "scheduled" | "cancelled";
    if (hasRecords) {
      lessonStatus = "completed";
    } else if (isPast) {
      lessonStatus = "absent";
    } else {
      lessonStatus = "scheduled";
    }

    // 시간 계산
    const startHours = lessonDate.getHours();
    const startMinutes = lessonDate.getMinutes();
    const startTime = startHours * 100 + startMinutes; // HHMM 형식의 number

    const endDate = new Date(lesson.endAt);
    const endHours = endDate.getHours();
    const endMinutes = endDate.getMinutes();
    const endTime = endHours * 100 + endMinutes; // HHMM 형식의 number

    return {
      id: lesson.id,
      lessonNumber: index + 1, // 순번 표시
      date: lessonDate.toISOString().split("T")[0],
      startTime,
      endTime,
      status: lessonStatus,
      memo: lesson.memo || null,
      recordCount: lesson.records.length,
    };
  });

  // 통계 계산
  const totalCompleted = completedLessons.length;
  const totalAbsent = absentLessons.length;
  const attendanceRate =
    pastLessons.length > 0
      ? Math.round((totalCompleted / pastLessons.length) * 100)
      : 100;

  // 평균 레코드 수 계산
  let totalRecords = 0;

  lessons.forEach((lesson) => {
    if (lesson.status === "completed") {
      totalRecords += lesson.recordCount;
    }
  });

  const averageRecords =
    totalCompleted > 0 ? Math.round(totalRecords / totalCompleted) : 0;

  // 회원 목표 파싱 (쉼표로 구분된 문자열)
  const memberGoals = pt.goals
    ? pt.goals
        .split(",")
        .map((goal) => goal.trim())
        .filter((goal) => goal.length > 0)
    : [];

  // 트레이너 노트 (PT description 사용)
  const trainerNotes = pt.description || null;

  // 최근 InBody 데이터 (실제로는 별도 테이블에서 조회)
  const latestInbody = null; // TODO: InBody 테이블 구현 후 연동

  return {
    id: pt.id,
    memberName: pt.member?.user.username || "알 수 없음",
    memberPhone: pt.member?.user.mobile || "",
    memberEmail: pt.member?.user.email || "",
    memberProfileImage: pt.member?.user.avatarImageId || null,
    ptProduct: {
      title: pt.ptProduct.title,
      description: pt.ptProduct.description,
      totalCount: pt.ptProduct.totalCount,
      sessionTime: pt.ptProduct.time, // time을 sessionTime으로 매핑
      price: pt.ptProduct.price,
    },
    status,
    startDate: new Date(pt.startDate).toISOString().split("T")[0],
    currentLesson,
    remainingLessons,
    expiryDate: expiryDate.toISOString().split("T")[0],
    nextLesson,
    lessons,
    stats: {
      totalCompleted,
      totalAbsent,
      attendanceRate,
      averageRecords,
    },
    memberGoals,
    trainerNotes,
    latestInbody,
  };
}

// 타입 추론
export type GetTrainerPtDetailResult = Awaited<
  ReturnType<typeof getTrainerPtDetail>
>;

// ===== Pending PT 관련 함수 =====

// Pending PT 목록 조회
export async function getTrainerPendingPts(trainerId: string) {
  const pendingPts = await prisma.pt.findMany({
    where: {
      trainerId,
      state: PtState.PENDING,
      startDate: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      startDate: true,
      goals: true,
      createdAt: true,
      member: {
        select: {
          user: {
            select: {
              username: true,
              mobile: true,
              avatarImageId: true,
            },
          },
        },
      },
      ptProduct: {
        select: {
          title: true,
          price: true,
          totalCount: true,
          time: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return pendingPts;
}

// PT 승인 처리
export async function approvePt(ptId: string, trainerId: string) {
  // 권한 확인을 위해 trainerId도 조건에 포함
  const updatedPt = await prisma.pt.update({
    where: {
      id: ptId,
      trainerId, // 해당 트레이너의 PT만 승인 가능
    },
    data: {
      state: PtState.CONFIRMED,
    },
    select: {
      id: true,
      state: true,
      member: {
        select: {
          user: {
            select: {
              username: true,
            },
          },
        },
      },
    },
  });

  return updatedPt;
}

// PT 거절 처리
export async function rejectPt(ptId: string, trainerId: string, reason: string) {
  // KST 시간 생성 (한국 시간 기준)
  const now = new Date();
  const kstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  
  // "2025년 01월 15일 14시 30분" 형식으로 변환
  const year = kstTime.getFullYear();
  const month = String(kstTime.getMonth() + 1).padStart(2, '0');
  const day = String(kstTime.getDate()).padStart(2, '0');
  const hours = String(kstTime.getHours()).padStart(2, '0');
  const minutes = String(kstTime.getMinutes()).padStart(2, '0');
  
  const schedule = `${year}년 ${month}월 ${day}일 ${hours}시 ${minutes}분`;

  // 트랜잭션으로 PT 상태 변경과 거절 정보 생성을 동시에 처리
  const result = await prisma.$transaction(async (tx) => {
    // PT 상태를 REJECTED로 변경
    const updatedPt = await tx.pt.update({
      where: {
        id: ptId,
        trainerId, // 해당 트레이너의 PT만 거절 가능
      },
      data: {
        state: PtState.REJECTED,
      },
      select: {
        id: true,
        state: true,
        member: {
          select: {
            user: {
              select: {
                username: true,
              },
            },
          },
        },
      },
    });

    // PtRejectInfo 생성
    const rejectInfo = await tx.ptRejectInfo.create({
      data: {
        ptId,
        reason,
        schedule,
      },
    });

    return { updatedPt, rejectInfo };
  });

  return result;
}

// Pending PT 관련 타입 추론
export type GetTrainerPendingPtsResult = Awaited<ReturnType<typeof getTrainerPendingPts>>;
export type ApprovePtResult = Awaited<ReturnType<typeof approvePt>>;
export type RejectPtResult = Awaited<ReturnType<typeof rejectPt>>;
