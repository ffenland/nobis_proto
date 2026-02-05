import prisma from "@/app/lib/prisma";
import { validateMasterAccess } from "./product.service";

// ===== 서비스 함수들 (타입 추론 활용) =====

// 취소된 레슨 목록 조회 (최근 2개월 이내)
export async function getCanceledLessons(masterId: string) {
  try {
    await validateMasterAccess(masterId);
    // 2개월 전 날짜 계산
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const canceledLessons = await prisma.lesson.findMany({
      where: {
        isCanceled: true,
      },
      select: {
        id: true,
        scheduledAt: true,
        endAt: true,
        memo: true,

        // PT 정보 (트레이너, 멤버 이름)
        pt: {
          select: {
            id: true,
            trainer: {
              select: {
                user: {
                  select: {
                    realname: true,
                    username: true,
                  },
                },
              },
            },
            member: {
              select: {
                user: {
                  select: {
                    realname: true,
                    username: true,
                  },
                },
              },
            },
          },
        },

        // 취소 정보
        cancelInfo: {
          select: {
            id: true,
            canceledBy: true,
            canceledByName: true,
            reason: true,
            canceledAt: true,
            createdAt: true, // 취소 요청일
            isApproved: true,
            approvedBy: {
              select: {
                user: {
                  select: {
                    realname: true,
                    username: true,
                  },
                },
              },
            },
            approvedById: true,
            approvedAt: true,
          },
        },

        // 센터 정보
        fitnessCenter: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: [
        { cancelInfo: { isApproved: "asc" } }, // 미승인이 먼저
        { cancelInfo: { canceledAt: "desc" } }, // 최근 취소 순
      ],
    });

    // cancelInfo가 있고 2개월 이내인 레슨만 필터링
    const filteredLessons = canceledLessons.filter(
      (l) => l.cancelInfo && new Date(l.cancelInfo.canceledAt) >= twoMonthsAgo
    );

    // 미승인/승인 분리
    const pendingLessons = filteredLessons.filter(
      (l) => l.cancelInfo && !l.cancelInfo.isApproved
    );
    const approvedLessons = filteredLessons.filter(
      (l) => l.cancelInfo && l.cancelInfo.isApproved
    );

    // 이름 fallback 처리 및 Date를 ISO 문자열로 변환하여 반환
    return {
      pendingLessons: pendingLessons.map((lesson) => ({
        id: lesson.id,
        scheduledAt: lesson.scheduledAt.toISOString(),
        endAt: lesson.endAt.toISOString(),
        memo: lesson.memo,
        ptId: lesson.pt.id,
        trainerName:
          lesson.pt.trainer?.user.realname ||
          lesson.pt.trainer?.user.username ||
          "알 수 없음",
        memberName:
          lesson.pt.member?.user.realname ||
          lesson.pt.member?.user.username ||
          "알 수 없음",
        cancelInfo: lesson.cancelInfo
          ? {
              id: lesson.cancelInfo.id,
              canceledBy: lesson.cancelInfo.canceledBy,
              canceledByName: lesson.cancelInfo.canceledByName,
              reason: lesson.cancelInfo.reason,
              canceledAt: lesson.cancelInfo.canceledAt.toISOString(),
              createdAt: lesson.cancelInfo.createdAt.toISOString(),
            }
          : null,
        centerTitle: lesson.fitnessCenter.title,
      })),
      approvedLessons: approvedLessons.map((lesson) => ({
        id: lesson.id,
        scheduledAt: lesson.scheduledAt.toISOString(),
        endAt: lesson.endAt.toISOString(),
        memo: lesson.memo,
        ptId: lesson.pt.id,
        trainerName:
          lesson.pt.trainer?.user.realname ||
          lesson.pt.trainer?.user.username ||
          "알 수 없음",
        memberName:
          lesson.pt.member?.user.realname ||
          lesson.pt.member?.user.username ||
          "알 수 없음",
        cancelInfo: lesson.cancelInfo
          ? {
              id: lesson.cancelInfo.id,
              canceledBy: lesson.cancelInfo.canceledBy,
              canceledByName: lesson.cancelInfo.canceledByName,
              reason: lesson.cancelInfo.reason,
              canceledAt: lesson.cancelInfo.canceledAt.toISOString(),
              createdAt: lesson.cancelInfo.createdAt.toISOString(),
              approvedAt: lesson.cancelInfo.approvedAt?.toISOString() ?? null,
              approverName:
                lesson.cancelInfo.approvedBy?.user?.realname ||
                lesson.cancelInfo.approvedBy?.user?.username ||
                "알 수 없음",
            }
          : null,
        centerTitle: lesson.fitnessCenter.title,
      })),
      pendingCount: pendingLessons.length,
      approvedCount: approvedLessons.length,
      totalCount: filteredLessons.length,
    };
  } catch (error) {
    console.error("Get canceled lessons error:", error);
    throw error;
  }
}

// 레슨 취소 승인 처리
export async function approveLessonCancel(masterId: string, lessonId: string) {
  try {
    // 권한확인
    await validateMasterAccess(masterId);
    // 권한 및 상태 확인
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        isCanceled: true,
      },
      select: {
        id: true,
        cancelInfo: {
          select: {
            id: true,
            isApproved: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new Error("해당 레슨을 찾을 수 없거나 권한이 없습니다.");
    }

    if (!lesson.cancelInfo) {
      throw new Error("취소 정보가 존재하지 않습니다.");
    }

    if (lesson.cancelInfo.isApproved) {
      throw new Error("이미 승인된 취소 요청입니다.");
    }

    // LessonCancel 승인 처리
    await prisma.lessonCancel.update({
      where: { id: lesson.cancelInfo.id },
      data: {
        isApproved: true,
        approvedById: masterId,
        approvedAt: new Date(),
      },
    });

    return {
      success: true,
      message: "레슨 취소가 승인되었습니다.",
    };
  } catch (error) {
    console.error("Approve lesson cancel error:", error);
    throw error;
  }
}

// 타입 추론
export type GetCanceledLessonsResult = Awaited<
  ReturnType<typeof getCanceledLessons>
>;

// 개별 타입 추출 및 export
export type LessonItem = GetCanceledLessonsResult["pendingLessons"][number];
export type CancelInfo = NonNullable<LessonItem["cancelInfo"]>;

export type ApproveLessonCancelResult = Awaited<
  ReturnType<typeof approveLessonCancel>
>;

// PT 일시정지 목록 조회 (최근 2개월 이내)
export async function getPtPauses(masterId: string) {
  try {
    await validateMasterAccess(masterId);
    // 2개월 전 날짜 계산
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    // PT 일시정지들 조회
    const ptPauses = await prisma.ptPause.findMany({
      where: {
        createdAt: {
          gte: twoMonthsAgo,
        },
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        reason: true,
        days: true,
        createdAt: true,
        isApproved: true,
        approvedAt: true,
        approvedBy: {
          select: {
            id: true,
            user: {
              select: {
                realname: true,
                username: true,
              },
            },
          },
        },
        approvedByMasterId: true,

        // PT 정보
        pt: {
          select: {
            id: true,
            startDate: true,
            trainer: {
              select: {
                id: true,
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
            member: {
              select: {
                id: true,
                user: {
                  select: {
                    realname: true,
                    username: true,
                  },
                },
              },
            },
            _count: {
              select: {
                lessons: {
                  where: {
                    isCanceled: false,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { isApproved: "asc" }, // 미승인이 먼저
        { createdAt: "desc" }, // 최근 생성 순
      ],
    });

    // 미승인/승인 분리
    const pendingPauses = ptPauses.filter((p) => !p.isApproved);
    const approvedPauses = ptPauses.filter((p) => p.isApproved);

    // Date를 ISO 문자열로 변환하여 반환
    return {
      pendingPauses: pendingPauses.map((pause) => ({
        id: pause.id,
        startDate: pause.startDate.toISOString(),
        endDate: pause.endDate.toISOString(),
        reason: pause.reason,
        days: pause.days,
        createdAt: pause.createdAt.toISOString(),
        ptId: pause.pt.id,
        ptStartDate: pause.pt.startDate.toISOString(),
        trainerName:
          pause.pt.trainer?.user.realname ||
          pause.pt.trainer?.user.username ||
          "알 수 없음",
        memberName:
          pause.pt.member?.user.realname ||
          pause.pt.member?.user.username ||
          "알 수 없음",
        completedLessonsCount: pause.pt._count.lessons,
        centerTitle: pause.pt.trainer?.fitnessCenter?.title || "알 수 없음",
      })),
      approvedPauses: approvedPauses.map((pause) => ({
        id: pause.id,
        startDate: pause.startDate.toISOString(),
        endDate: pause.endDate.toISOString(),
        reason: pause.reason,
        days: pause.days,
        createdAt: pause.createdAt.toISOString(),
        approvedAt: pause.approvedAt?.toISOString() ?? null,
        approverName:
          pause.approvedBy?.user?.realname ||
          pause.approvedBy?.user?.username ||
          "알 수 없음",
        ptId: pause.pt.id,
        ptStartDate: pause.pt.startDate.toISOString(),
        trainerName:
          pause.pt.trainer?.user.realname ||
          pause.pt.trainer?.user.username ||
          "알 수 없음",
        memberName:
          pause.pt.member?.user.realname ||
          pause.pt.member?.user.username ||
          "알 수 없음",
        completedLessonsCount: pause.pt._count.lessons,
        centerTitle: pause.pt.trainer?.fitnessCenter?.title || "알 수 없음",
      })),
      pendingCount: pendingPauses.length,
      approvedCount: approvedPauses.length,
      totalCount: ptPauses.length,
    };
  } catch (error) {
    console.error("Get PT pauses error:", error);
    throw error;
  }
}

// PT 일시정지 승인 처리
export async function approvePtPause(masterId: string, ptPauseId: string) {
  try {
    await validateMasterAccess(masterId);
    // 권한 및 상태 확인
    const ptPause = await prisma.ptPause.findFirst({
      where: {
        id: ptPauseId,
      },
      select: {
        id: true,
        isApproved: true,
      },
    });

    if (!ptPause) {
      throw new Error("해당 일시정지 요청을 찾을 수 없습니다.");
    }

    if (ptPause.isApproved) {
      throw new Error("이미 승인된 일시정지 요청입니다.");
    }

    // PtPause 승인 처리
    await prisma.ptPause.update({
      where: { id: ptPauseId },
      data: {
        isApproved: true,
        approvedByMasterId: masterId,
        approvedAt: new Date(),
      },
    });

    return {
      success: true,
      message: "PT 일시정지가 승인되었습니다.",
    };
  } catch (error) {
    console.error("Approve PT pause error:", error);
    throw error;
  }
}

// 타입 추론
export type GetPtPausesResult = Awaited<ReturnType<typeof getPtPauses>>;

// 개별 타입 추출 및 export
export type PtPauseItem = GetPtPausesResult["pendingPauses"][number];

export type ApprovePtPauseResult = Awaited<ReturnType<typeof approvePtPause>>;

// 결제 내역 조회 (월별)
export async function getPaymentsByMonth(yearMonth: string) {
  try {
    // YYYYMM 형식의 문자열을 파싱
    const year = parseInt(yearMonth.substring(0, 4));
    const month = parseInt(yearMonth.substring(4, 6));

    // KST 기준 해당 월의 시작일과 종료일 계산
    const KST_OFFSET = 9 * 60 * 60 * 1000; // 9시간 (밀리초)

    // KST 기준 해당 월의 1일 00:00:00를 UTC로 변환
    const startDate = new Date(Date.UTC(year, month - 1, 1) - KST_OFFSET);

    // KST 기준 다음 월의 1일 00:00:00에서 1밀리초를 빼서 이번 달 마지막 순간을 UTC로 변환
    const endDate = new Date(Date.UTC(year, month, 1) - KST_OFFSET - 1);

    // PtPayment 조회
    const payments = await prisma.ptPayment.findMany({
      where: {
        OR: [
          {
            // createdAt이 해당 월에 속하거나
            createdAt: {
              gte: startDate,
              lt: endDate,
            },
          },
          {
            // PT의 startDate가 해당 월에 속하는 경우
            pt: {
              startDate: {
                gte: startDate,
                lt: endDate,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        amount: true,
        discount: true,
        deduction: true,
        method: true,
        state: true,
        paidAt: true,
        refundedAt: true,
        refundAmount: true,
        createdAt: true,
        pt: {
          select: {
            id: true,
            state: true,
            startDate: true,
            member: {
              select: {
                user: {
                  select: {
                    realname: true,
                    username: true,
                  },
                },
              },
            },
            trainer: {
              select: {
                user: {
                  select: {
                    realname: true,
                    username: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // state별로 분류
    const pendingPayments = payments.filter((p) => p.state === "PENDING");
    const completedPayments = payments.filter((p) => p.state === "COMPLETED");
    const refundedPayments = payments.filter((p) => p.state === "REFUNDED");
    const otherPayments = payments.filter(
      (p) => !["PENDING", "COMPLETED", "REFUNDED"].includes(p.state)
    );

    // Date를 ISO 문자열로 변환하여 반환
    const mapPayment = (payment: (typeof payments)[number]) => ({
      id: payment.id,
      amount: payment.amount,
      discount: payment.discount,
      deduction: payment.deduction,
      method: payment.method,
      state: payment.state,
      paidAt: payment.paidAt?.toISOString() ?? null,
      refundedAt: payment.refundedAt?.toISOString() ?? null,
      refundAmount: payment.refundAmount,
      createdAt: payment.createdAt.toISOString(),
      pt: {
        id: payment.pt.id,
        state: payment.pt.state,
        startDate: payment.pt.startDate.toISOString(),
        memberName:
          payment.pt.member?.user.realname ||
          payment.pt.member?.user.username ||
          "알 수 없음",
        trainerName:
          payment.pt.trainer?.user.realname ||
          payment.pt.trainer?.user.username ||
          "알 수 없음",
      },
    });

    return {
      pendingPayments: pendingPayments.map(mapPayment),
      completedPayments: completedPayments.map(mapPayment),
      refundedPayments: refundedPayments.map(mapPayment),
      otherPayments: otherPayments.map(mapPayment),
      pendingCount: pendingPayments.length,
      completedCount: completedPayments.length,
      refundedCount: refundedPayments.length,
      otherCount: otherPayments.length,
      totalCount: payments.length,
      yearMonth,
    };
  } catch (error) {
    console.error("Get payments by month error:", error);
    throw error;
  }
}

// 타입 추론
export type GetPaymentsByMonthResult = Awaited<
  ReturnType<typeof getPaymentsByMonth>
>;

export type PaymentItem = GetPaymentsByMonthResult["pendingPayments"][number];
