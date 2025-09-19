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
        where: {
          isCanceled: false, // 취소되지 않은 레슨만 조회
        },
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
        where: {
          isCanceled: false, // 취소되지 않은 레슨만 조회
        },
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
        where: {
          isCanceled: false, // 취소되지 않은 레슨만 조회
        },
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

// PT 거절 처리
export async function rejectPt(
  ptId: string,
  trainerId: string,
  reason: string
) {
  // KST 시간 생성 (한국 시간 기준)
  const now = new Date();
  const kstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  // "2025년 01월 15일 14시 30분" 형식으로 변환
  const year = kstTime.getFullYear();
  const month = String(kstTime.getMonth() + 1).padStart(2, "0");
  const day = String(kstTime.getDate()).padStart(2, "0");
  const hours = String(kstTime.getHours()).padStart(2, "0");
  const minutes = String(kstTime.getMinutes()).padStart(2, "0");

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
        stateUpdatedAt: new Date(),
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

// ===== PT 승인과 레슨 생성 관련 =====

// 레슨 생성 입력 타입 (lesson.service.ts에서 가져옴)
export type CreateLessonInput = {
  scheduledAt: string; // ISO 8601 DateTime 문자열
  endAt: string; // ISO 8601 DateTime 문자열
  memo?: string;
};

// 트레이너 수업 충돌 검사 함수 (lesson.service.ts에서 가져옴)
async function checkTrainerLessonConflict(
  trainerId: string,
  scheduledAt: Date,
  endAt: Date
) {
  const startOfDay = new Date(scheduledAt);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(endAt);
  endOfDay.setHours(23, 59, 59, 999);

  const conflicts = await prisma.lesson.findMany({
    where: {
      pt: {
        trainerId,
        state: PtState.CONFIRMED, // CONFIRMED PT의 레슨들만 충돌 체크
      },
      scheduledAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      isCanceled: false, // 취소되지 않은 레슨만 충돌 체크
    },
    select: {
      id: true,
      scheduledAt: true,
      endAt: true,
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
        },
      },
    },
  });

  // 시간 겹침 체크
  return conflicts
    .filter((lesson) => {
      const lessonStart = lesson.scheduledAt;
      const lessonEnd = lesson.endAt;

      // 새 수업이 기존 수업과 겹치는지 확인
      return (
        (scheduledAt >= lessonStart && scheduledAt < lessonEnd) || // 시작시간이 기존 수업 중간에
        (endAt > lessonStart && endAt <= lessonEnd) || // 끝시간이 기존 수업 중간에
        (scheduledAt <= lessonStart && endAt >= lessonEnd) // 기존 수업을 완전히 포함
      );
    })
    .map((lesson) => ({
      id: lesson.id,
      startTime: lesson.scheduledAt.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      endTime: lesson.endAt.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      memberName: lesson.pt?.member?.user.username || "알 수 없음",
    }));
}

// PT 승인과 첫 레슨 생성을 동시에 처리하는 함수
export async function createLessonWithPtApproval(
  trainerId: string,
  ptId: string,
  lessonData: CreateLessonInput
) {
  try {
    // 사전 PT 확인 (트레이너 센터 정보 필요)
    const ptInfo = await prisma.pt.findUnique({
      where: {
        id: ptId,
        trainerId: trainerId,
        state: PtState.PENDING,
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

    if (!ptInfo || !ptInfo.trainer?.fitnessCenterId) {
      return {
        success: false,
        message: "해당 PT를 찾을 수 없거나 트레이너의 센터 정보가 없습니다.",
      };
    }

    // 시간 파싱
    const scheduledAt = new Date(lessonData.scheduledAt);
    const endAt = new Date(lessonData.endAt);

    // 안전장치: 간단한 스케줄 체크 (레이스 컨디션 방지)
    const conflictingLessons = await checkTrainerLessonConflict(
      trainerId,
      scheduledAt,
      endAt
    );

    if (conflictingLessons.length > 0) {
      const firstConflict = conflictingLessons[0];
      const message = `선택하신 날짜에 ${firstConflict.startTime}부터 ${firstConflict.endTime}까지 ${firstConflict.memberName}님과의 수업이 있습니다.`;

      return {
        success: false,
        message: message,
      };
    }

    // 트랜잭션으로 PT 승인과 레슨 생성을 원자적으로 처리
    const result = await prisma.$transaction(async (tx) => {
      // 1. PT 확인 및 승인
      const pt = await tx.pt.findUnique({
        where: {
          id: ptId,
          trainerId: trainerId,
          state: PtState.PENDING, // PENDING 상태의 PT만 승인 가능
        },
        select: {
          id: true,
          startDate: true,
          trainer: {
            select: {
              fitnessCenterId: true,
            },
          },
          ptProduct: {
            select: {
              expiration_period: true,
            },
          },
        },
      });

      if (!pt) {
        throw new Error("해당 PT를 찾을 수 없거나 이미 처리되었습니다.");
      }

      if (!pt.trainer?.fitnessCenterId) {
        throw new Error("트레이너의 센터 정보가 없습니다.");
      }

      // 2. PT 승인 (PENDING → CONFIRMED)
      const expirationDate = new Date();
      expirationDate.setDate(
        expirationDate.getDate() + pt.ptProduct.expiration_period
      );
      const approvedPt = await tx.pt.update({
        where: { id: ptId },
        data: {
          state: PtState.CONFIRMED,
          stateUpdatedAt: new Date(),
          expirationDate,
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
            },
          },
        },
      });

      // 3. 첫 레슨 생성 (중복 체크는 이미 트랜잭션 밖에서 완료됨)
      const lesson = await tx.lesson.create({
        data: {
          ptId: ptId,
          scheduledAt: scheduledAt,
          endAt: endAt,
          fitnessCenterId: ptInfo.trainer!.fitnessCenterId!,
          memo: lessonData.memo || "",
        },
        select: {
          id: true,
          scheduledAt: true,
          endAt: true,
          memo: true,
        },
      });

      return {
        pt: approvedPt,
        lesson: lesson,
      };
    });

    return {
      success: true,
      ptId: result.pt.id,
      lessonId: result.lesson.id,
      message: `${result.pt.member?.user.username}님의 ${result.pt.ptProduct.title} PT가 승인되고 첫 수업이 등록되었습니다.`,
      data: {
        pt: result.pt,
        lesson: result.lesson,
      },
    };
  } catch (error) {
    console.error("Create lesson with PT approval error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "PT 승인 및 레슨 생성 중 오류가 발생했습니다.";
    return {
      success: false,
      message: errorMessage,
    };
  }
}

// Pending PT 관련 타입 추론
export type GetTrainerPendingPtsResult = Awaited<
  ReturnType<typeof getTrainerPendingPts>
>;
export type RejectPtResult = Awaited<ReturnType<typeof rejectPt>>;
export type CreateLessonWithPtApprovalResult = Awaited<
  ReturnType<typeof createLessonWithPtApproval>
>;

// ===== PT 직접 생성 관련 함수들 =====

// 설문지 조회
export async function getSurveyQuestions() {
  const survey = await prisma.ptSurvey.findFirst({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      title: true,
      description: true,
      questions: {
        select: {
          id: true,
          questionText: true,
          questionType: true,
          options: true,
          isRequired: true,
          order: true,
        },
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  return survey;
}

// PT 생성용 Member 목록 조회 (최근 50명 + 검색)
export async function getMembersForPtCreation(
  trainerId: string,
  searchQuery?: string
) {
  // 검색 조건 설정
  const whereCondition = {
    active: true,
    ...(searchQuery && {
      user: {
        username: {
          contains: searchQuery,
          mode: "insensitive" as const,
        },
      },
    }),
  };

  // 검색어가 있으면 전체 검색, 없으면 최근 50명
  const members = await prisma.member.findMany({
    where: whereCondition,
    select: {
      id: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          mobile: true,
          avatarImageId: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      user: {
        createdAt: "desc", // 최신 순으로 정렬
      },
    },
    ...(searchQuery ? {} : { take: 50 }), // 검색어 없으면 50개 제한
  });

  return members;
}

// PT 생성용 Member 상세 정보 조회 (과거 6개월 PT 히스토리 포함)
export async function getMemberDetailsForPtCreation(memberId: string) {
  // 6개월 전 날짜 계산
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Member 기본 정보 + PT 정보 조회
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          mobile: true,
          createdAt: true,
          avatarImage: {
            select: {
              cloudflareId: true,
            },
          },
        },
      },
      pt: {
        where: {
          createdAt: { gte: sixMonthsAgo },
        },
        select: {
          id: true,
          state: true,
          createdAt: true,
          startDate: true,
          trainer: {
            select: {
              id: true,
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
    },
  });

  if (!member) {
    throw new Error("회원을 찾을 수 없습니다.");
  }

  // CONFIRMED 상태의 PT는 상세 정보와 함께
  const confirmedPts = member.pt.filter(pt => pt.state === 'CONFIRMED');

  // 다른 상태들은 count만
  const stateCounts = {
    PENDING: member.pt.filter(pt => pt.state === 'PENDING').length,
    REJECTED: member.pt.filter(pt => pt.state === 'REJECTED').length,
    FINISHED: member.pt.filter(pt => pt.state === 'FINISHED').length,
    ACCEPTING: member.pt.filter(pt => pt.state === 'ACCEPTING').length,
  };

  return {
    ...member,
    confirmedPts,
    stateCounts,
  };
}

// PT 상품 목록 조회 (트레이너 레벨에 맞는)
export async function getPtProductsForTrainer(trainerId: string) {
  const trainer = await prisma.trainer.findUnique({
    where: { id: trainerId },
    select: {
      level: true,
    },
  });

  if (!trainer) {
    throw new Error("트레이너를 찾을 수 없습니다.");
  }

  const ptProducts = await prisma.ptProduct.findMany({
    where: {
      onSale: true,
      closedAt: {
        gt: new Date(),
      },
      trainer: {
        some: {
          id: trainerId,
        },
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      totalCount: true,
      time: true,
      expiration_period: true,
    },
    orderBy: {
      price: "asc",
    },
  });

  return ptProducts;
}

// 설문 응답 저장
export async function submitSurveyResponse(
  trainerId: string,
  memberId: string,
  surveyId: string,
  responses: Array<{ questionId: string; answer: string }>,
  signatureImageId?: string
) {
  const surveyResponse = await prisma.ptSurveyResponse.create({
    data: {
      surveyId,
      memberId,
      trainerId,
      signatureImageId,
      questionResponses: {
        create: responses.map((response) => ({
          questionId: response.questionId,
          answer: response.answer,
        })),
      },
    },
    select: {
      id: true,
      completedAt: true,
    },
  });

  return surveyResponse;
}

// 직접 PT 생성 (설문 응답 + PT + 첫 레슨)
export interface CreateDirectPtInput {
  memberId: string;
  ptProductId: string;
  startDate: Date;
  description: string;
  goals: string;
  firstLessonScheduledAt: string; // ISO DateTime string
  firstLessonEndAt: string; // ISO DateTime string
  firstLessonMemo?: string;
}

export async function createDirectPt(
  trainerId: string,
  data: CreateDirectPtInput
) {
  try {
    // 사전 검증
    const trainer = await prisma.trainer.findUnique({
      where: { id: trainerId },
      select: {
        fitnessCenterId: true,
      },
    });

    if (!trainer?.fitnessCenterId) {
      throw new Error("트레이너의 센터 정보가 없습니다.");
    }

    const ptProduct = await prisma.ptProduct.findUnique({
      where: { id: data.ptProductId },
      select: {
        id: true,
        price: true,
        expiration_period: true,
      },
    });

    if (!ptProduct) {
      throw new Error("PT 상품을 찾을 수 없습니다.");
    }

    // 시간 파싱
    const scheduledAt = new Date(data.firstLessonScheduledAt);
    const endAt = new Date(data.firstLessonEndAt);

    // 스케줄 충돌 체크
    const conflictingLessons = await checkTrainerLessonConflict(
      trainerId,
      scheduledAt,
      endAt
    );

    if (conflictingLessons.length > 0) {
      const firstConflict = conflictingLessons[0];
      throw new Error(
        `선택하신 날짜에 ${firstConflict.startTime}부터 ${firstConflict.endTime}까지 ${firstConflict.memberName}님과의 수업이 있습니다.`
      );
    }

    // 트랜잭션으로 PT와 첫 레슨 생성
    const result = await prisma.$transaction(async (tx) => {
      // 만료일 계산
      const expirationDate = new Date(data.startDate);
      expirationDate.setDate(
        expirationDate.getDate() + ptProduct.expiration_period
      );

      // PT 생성
      const pt = await tx.pt.create({
        data: {
          memberId: data.memberId,
          trainerId,
          ptProductId: data.ptProductId,
          state: PtState.CONFIRMED, // 직접 생성이므로 바로 확정
          startDate: data.startDate,
          expirationDate,
          description: data.description,
          goals: data.goals,
          paymentAmount: ptProduct.price,
          stateUpdatedAt: new Date(),
        },
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
            },
          },
        },
      });

      // 첫 레슨 생성
      const lesson = await tx.lesson.create({
        data: {
          ptId: pt.id,
          scheduledAt,
          endAt,
          fitnessCenterId: trainer.fitnessCenterId!,
          memo: data.firstLessonMemo || "",
        },
        select: {
          id: true,
          scheduledAt: true,
          endAt: true,
          memo: true,
        },
      });

      return { pt, lesson };
    });

    return {
      success: true,
      ptId: result.pt.id,
      lessonId: result.lesson.id,
      message: `${result.pt.member?.user.username}님의 ${result.pt.ptProduct.title} PT가 생성되고 첫 수업이 등록되었습니다.`,
      data: {
        pt: result.pt,
        lesson: result.lesson,
      },
    };
  } catch (error) {
    console.error("Create direct PT error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "PT 생성 중 오류가 발생했습니다.";
    return {
      success: false,
      message: errorMessage,
    };
  }
}

// PENDING PT 생성 (Description 단계에서)
export interface CreatePendingPtInput {
  memberId: string;
  ptProductId: string;
  description: string;
  goals: string;
}

export async function createPendingPt(
  trainerId: string,
  data: CreatePendingPtInput
) {
  try {
    // 사전 검증
    const trainer = await prisma.trainer.findUnique({
      where: { id: trainerId },
      select: {
        fitnessCenterId: true,
      },
    });

    if (!trainer?.fitnessCenterId) {
      throw new Error("트레이너의 센터 정보가 없습니다.");
    }

    const ptProduct = await prisma.ptProduct.findUnique({
      where: { id: data.ptProductId },
      select: {
        id: true,
        price: true,
        expiration_period: true,
        title: true,
      },
    });

    if (!ptProduct) {
      throw new Error("PT 상품을 찾을 수 없습니다.");
    }

    // PT 생성 (PENDING 상태)
    const pt = await prisma.pt.create({
      data: {
        memberId: data.memberId,
        trainerId,
        ptProductId: data.ptProductId,
        state: PtState.PENDING,
        startDate: new Date(), // 임시 시작일 (나중에 업데이트)
        description: data.description,
        goals: data.goals,
        paymentAmount: ptProduct.price,
        stateUpdatedAt: new Date(),
      },
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
          },
        },
      },
    });

    return {
      success: true,
      ptId: pt.id,
      message: `${pt.member?.user.username}님의 ${pt.ptProduct.title} PT가 임시 생성되었습니다.`,
      data: pt,
    };
  } catch (error) {
    console.error("Create pending PT error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "PT 생성 중 오류가 발생했습니다.";
    return {
      success: false,
      message: errorMessage,
    };
  }
}

// PT 확정 처리 (PENDING → CONFIRMED + 첫 레슨 생성)
export interface ConfirmPtInput {
  ptId: string;
  startDate: Date;
  firstLessonScheduledAt: string; // ISO DateTime string
  firstLessonEndAt: string; // ISO DateTime string
  firstLessonMemo?: string;
  contractImageId?: string; // 계약서 이미지 ID (선택사항)
}

export async function confirmPt(trainerId: string, data: ConfirmPtInput) {
  try {
    // 사전 검증
    const trainer = await prisma.trainer.findUnique({
      where: { id: trainerId },
      select: {
        fitnessCenterId: true,
      },
    });

    if (!trainer?.fitnessCenterId) {
      throw new Error("트레이너의 센터 정보가 없습니다.");
    }

    // PT 확인
    const pt = await prisma.pt.findUnique({
      where: {
        id: data.ptId,
        trainerId: trainerId,
        state: PtState.PENDING,
      },
      select: {
        id: true,
        ptProduct: {
          select: {
            expiration_period: true,
            title: true,
          },
        },
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

    if (!pt) {
      throw new Error("해당 PT를 찾을 수 없거나 이미 처리되었습니다.");
    }

    // 시간 파싱
    const scheduledAt = new Date(data.firstLessonScheduledAt);
    const endAt = new Date(data.firstLessonEndAt);

    // 스케줄 충돌 체크
    const conflictingLessons = await checkTrainerLessonConflict(
      trainerId,
      scheduledAt,
      endAt
    );

    if (conflictingLessons.length > 0) {
      const firstConflict = conflictingLessons[0];
      throw new Error(
        `선택하신 날짜에 ${firstConflict.startTime}부터 ${firstConflict.endTime}까지 ${firstConflict.memberName}님과의 수업이 있습니다.`
      );
    }

    // 트랜잭션으로 PT 확정과 첫 레슨 생성
    const result = await prisma.$transaction(async (tx) => {
      // 만료일 계산
      const expirationDate = new Date(data.startDate);
      expirationDate.setDate(
        expirationDate.getDate() + pt.ptProduct.expiration_period
      );

      // PT 확정 (PENDING → CONFIRMED)
      const updatedPt = await tx.pt.update({
        where: { id: data.ptId },
        data: {
          state: PtState.CONFIRMED,
          startDate: data.startDate,
          expirationDate,
          stateUpdatedAt: new Date(),
          ...(data.contractImageId && {
            contractImageId: data.contractImageId,
          }),
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
            },
          },
        },
      });

      // 첫 레슨 생성
      const lesson = await tx.lesson.create({
        data: {
          ptId: data.ptId,
          scheduledAt,
          endAt,
          fitnessCenterId: trainer.fitnessCenterId!,
          memo: data.firstLessonMemo || "",
        },
        select: {
          id: true,
          scheduledAt: true,
          endAt: true,
          memo: true,
        },
      });

      return { pt: updatedPt, lesson };
    });

    return {
      success: true,
      ptId: result.pt.id,
      lessonId: result.lesson.id,
      message: `${result.pt.member?.user.username}님의 ${result.pt.ptProduct.title} PT가 확정되고 첫 수업이 등록되었습니다.`,
      data: {
        pt: result.pt,
        lesson: result.lesson,
      },
    };
  } catch (error) {
    console.error("Confirm PT error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "PT 확정 중 오류가 발생했습니다.";
    return {
      success: false,
      message: errorMessage,
    };
  }
}

// 직접 PT 생성 관련 타입 추론
export type GetSurveyQuestionsResult = Awaited<
  ReturnType<typeof getSurveyQuestions>
>;
export type GetMembersForPtCreationResult = Awaited<
  ReturnType<typeof getMembersForPtCreation>
>;
export type GetPtProductsForTrainerResult = Awaited<
  ReturnType<typeof getPtProductsForTrainer>
>;
export type SubmitSurveyResponseResult = Awaited<
  ReturnType<typeof submitSurveyResponse>
>;
export type CreateDirectPtResult = Awaited<ReturnType<typeof createDirectPt>>;
export type CreatePendingPtResult = Awaited<ReturnType<typeof createPendingPt>>;
export type ConfirmPtResult = Awaited<ReturnType<typeof confirmPt>>;

// ===== 새로운 트레이너 PT 생성 시스템 =====

// 트레이너 PT 생성용 타입
export interface CreateTrainerPtInput {
  memberId: string;
  ptProductId: string;
  trainerId: string;
}

// PT 업데이트용 타입
export interface UpdatePendingPtInput {
  description?: string;
  goals?: string;
  contractImageIds?: string[]; // 계약서 이미지 ID 배열
}

// 첫 레슨 생성용 타입
export interface CreateFirstLessonInput {
  scheduledAt: string; // ISO DateTime string
  endAt: string; // ISO DateTime string
  memo?: string;
}

// 트레이너가 ACCEPTING 상태로 PT 생성
export async function createTrainerPt(input: CreateTrainerPtInput) {
  try {
    // 사전 검증
    const trainer = await prisma.trainer.findUnique({
      where: { id: input.trainerId },
      select: {
        fitnessCenterId: true,
      },
    });

    if (!trainer?.fitnessCenterId) {
      throw new Error("트레이너의 센터 정보가 없습니다.");
    }

    const member = await prisma.member.findUnique({
      where: { id: input.memberId },
      select: {
        id: true,
        active: true,
      },
    });

    if (!member || !member.active) {
      throw new Error("유효하지 않은 회원입니다.");
    }

    const ptProduct = await prisma.ptProduct.findUnique({
      where: { id: input.ptProductId },
      select: {
        id: true,
        price: true,
        expiration_period: true,
        title: true,
      },
    });

    if (!ptProduct) {
      throw new Error("PT 상품을 찾을 수 없습니다.");
    }

    // PT 생성 (ACCEPTING 상태로)
    const pt = await prisma.pt.create({
      data: {
        memberId: input.memberId,
        trainerId: input.trainerId,
        ptProductId: input.ptProductId,
        state: PtState.ACCEPTING,
        startDate: new Date(), // 기본값으로 오늘 날짜 설정
        expirationDate: new Date(
          Date.now() + ptProduct.expiration_period * 24 * 60 * 60 * 1000
        ),
        paymentAmount: ptProduct.price,
        stateUpdatedAt: new Date(),
      },
      select: {
        id: true,
        state: true,
        member: {
          select: {
            user: {
              select: {
                username: true,
                email: true,
              },
            },
          },
        },
        ptProduct: {
          select: {
            title: true,
            price: true,
          },
        },
      },
    });

    return pt;
  } catch (error) {
    console.error("트레이너 PT 생성 중 오류:", error);
    throw error;
  }
}

// ACCEPTING, PENDING 상태 PT 목록 조회 (정렬 적용)
export async function getTrainerAcceptingPendingPts(trainerId: string) {
  const pts = await prisma.pt.findMany({
    where: {
      trainerId,
      state: {
        in: [PtState.ACCEPTING, PtState.PENDING],
      },
    },
    select: {
      id: true,
      state: true,
      startDate: true,
      createdAt: true,
      description: true,
      goals: true,
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
          price: true,
          totalCount: true,
          time: true,
        },
      },
    },
    orderBy: [
      // ACCEPTING이 먼저 오도록 정렬
      {
        state: "desc", // ACCEPTING > PENDING (enum 순서에 따라)
      },
      // 동일한 상태 내에서는 최신순
      {
        createdAt: "desc",
      },
    ],
  });

  return pts;
}

// Pending PT 상세 조회
export async function getPendingPtDetail(ptId: string, trainerId: string) {
  const pt = await prisma.pt.findFirst({
    where: {
      id: ptId,
      trainerId,
      state: {
        in: [PtState.ACCEPTING, PtState.PENDING],
      },
    },
    select: {
      id: true,
      state: true,
      startDate: true,
      description: true,
      goals: true,
      contractImage: {
        select: {
          id: true,
          cloudflareId: true,
        },
      },
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
          price: true,
          totalCount: true,
          time: true,
          description: true,
        },
      },
    },
  });

  if (!pt) {
    throw new Error("해당 PT를 찾을 수 없거나 접근 권한이 없습니다.");
  }

  return pt;
}

// Pending PT 업데이트
export async function updatePendingPt(
  ptId: string,
  trainerId: string,
  input: UpdatePendingPtInput
) {
  try {
    // 권한 확인
    const existingPt = await prisma.pt.findFirst({
      where: {
        id: ptId,
        trainerId,
        state: {
          in: [PtState.ACCEPTING, PtState.PENDING],
        },
      },
      select: {
        id: true,
      },
    });

    if (!existingPt) {
      throw new Error("해당 PT를 찾을 수 없거나 수정 권한이 없습니다.");
    }

    // 업데이트 실행
    const updatedPt = await prisma.pt.update({
      where: { id: ptId },
      data: {
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.goals !== undefined && { goals: input.goals }),
        ...(input.contractImageIds !== undefined && {
          contractImage: {
            set: input.contractImageIds.map((id) => ({ id })),
          },
        }),
      },
      select: {
        id: true,
        description: true,
        goals: true,
        contractImage: {
          select: {
            id: true,
            cloudflareId: true,
          },
        },
      },
    });

    return updatedPt;
  } catch (error) {
    console.error("Pending PT 업데이트 중 오류:", error);
    throw error;
  }
}

// PT 승인 + 첫 레슨 생성 + CONFIRMED 상태 변경
export async function confirmPtWithFirstLesson(
  ptId: string,
  trainerId: string,
  lessonInput: CreateFirstLessonInput
) {
  try {
    // PT 존재 및 권한 확인, Trainer의 fitnessCenter 정보도 조회
    const pt = await prisma.pt.findFirst({
      where: {
        id: ptId,
        trainerId,
        state: {
          in: [PtState.ACCEPTING, PtState.PENDING],
        },
      },
      select: {
        id: true,
        ptProduct: {
          select: {
            expiration_period: true,
          },
        },
        trainer: {
          select: {
            fitnessCenterId: true,
          },
        },
      },
    });

    if (!pt) {
      throw new Error("해당 PT를 찾을 수 없거나 승인 권한이 없습니다.");
    }

    if (!pt.trainer?.fitnessCenterId) {
      throw new Error("트레이너가 피트니스 센터에 소속되어 있지 않습니다.");
    }

    // 시간 파싱 및 검증
    const scheduledAt = new Date(lessonInput.scheduledAt);
    const endAt = new Date(lessonInput.endAt);

    if (isNaN(scheduledAt.getTime()) || isNaN(endAt.getTime())) {
      throw new Error("유효하지 않은 날짜/시간 형식입니다.");
    }

    if (scheduledAt >= endAt) {
      throw new Error("수업 시작 시간이 종료 시간보다 늦을 수 없습니다.");
    }

    // 스케줄 충돌 체크
    const conflictingLessons = await checkTrainerLessonConflict(
      trainerId,
      scheduledAt,
      endAt
    );

    if (conflictingLessons.length > 0) {
      const firstConflict = conflictingLessons[0];
      throw new Error(
        `선택하신 시간대에 ${firstConflict.startTime}부터 ${firstConflict.endTime}까지 ${firstConflict.memberName}님과의 수업이 예정되어 있습니다.`
      );
    }

    // 트랜잭션으로 PT 상태 변경 + 레슨 생성
    const result = await prisma.$transaction(async (tx) => {
      // PT 상태를 CONFIRMED로 변경
      const confirmedPt = await tx.pt.update({
        where: { id: ptId },
        data: {
          state: PtState.CONFIRMED,
          stateUpdatedAt: new Date(),
          // startDate는 첫 레슨 날짜로 업데이트
          startDate: scheduledAt,
          // expirationDate 재계산
          expirationDate: new Date(
            scheduledAt.getTime() +
              pt.ptProduct.expiration_period * 24 * 60 * 60 * 1000
          ),
        },
        select: {
          id: true,
          state: true,
        },
      });

      // 첫 레슨 생성
      const lesson = await tx.lesson.create({
        data: {
          ptId,
          fitnessCenterId: pt.trainer!.fitnessCenterId!,
          scheduledAt,
          endAt,
          memo: lessonInput.memo || "",
        },
        select: {
          id: true,
          scheduledAt: true,
          endAt: true,
        },
      });

      return {
        pt: confirmedPt,
        lesson,
      };
    });

    return {
      ptId: result.pt.id,
      lessonId: result.lesson.id,
      success: true,
    };
  } catch (error) {
    console.error("PT 승인 및 첫 레슨 생성 중 오류:", error);
    throw error;
  }
}

// 새로운 타입 정의들
export type CreateTrainerPtResult = Awaited<ReturnType<typeof createTrainerPt>>;
export type GetTrainerAcceptingPendingPtsResult = Awaited<
  ReturnType<typeof getTrainerAcceptingPendingPts>
>;
export type GetPendingPtDetailResult = Awaited<
  ReturnType<typeof getPendingPtDetail>
>;
export type UpdatePendingPtResult = Awaited<ReturnType<typeof updatePendingPt>>;
export type ConfirmPtWithFirstLessonResult = Awaited<
  ReturnType<typeof confirmPtWithFirstLesson>
>;
export type GetMemberDetailsForPtCreationResult = Awaited<
  ReturnType<typeof getMemberDetailsForPtCreation>
>;
