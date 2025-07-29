import prisma from "@/app/lib/prisma";
import { PtState } from "@prisma/client";
import {
  calculateCompletedSessions,
  calculateAttendanceStatus,
} from "@/app/lib/utils/pt.utils";
import { formatTime } from "@/app/lib/utils/time.utils";

// 대시보드 통계 타입 정의
export type MemberDashboardStats = {
  pendingPt: {
    id: string;
    startDate: string;
    description: string | null;
    ptProduct: {
      title: string;
      totalCount: number;
      time: number;
      price: number;
    };
    trainerName: string;
    trainerPhone: string | null;
    trainerId: string;
    trainerUserId: string;
  } | null;
  confirmedPt: {
    id: string;
    startDate: string;
    description: string | null;
    ptProduct: {
      title: string;
      totalCount: number;
      time: number;
      price: number;
    };
    trainerName: string;
    trainerPhone: string | null;
    trainerId: string;
    trainerUserId: string;
  } | null;
  ptProgress: {
    completed: number;
    total: number;
    percentage: number;
  } | null;
  totalSessions: number;
  thisMonthSessions: number;
  nextSession: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    ptTitle: string;
    trainerName: string;
    sessionNumber: number;
  } | null;
  pendingScheduleChange: {
    ptRecordId: string;
    count: number;
  } | null;
};

// 회원 대시보드 통계 조회
export async function getMemberDashboardStats(memberId: string) {
  const currentTime = new Date();

  // PENDING 상태의 PT 조회 (최대 1개)
  const pendingPt = await prisma.pt.findFirst({
    where: {
      memberId,
      state: PtState.PENDING,
    },
    select: {
      id: true,
      startDate: true,
      description: true,
      ptProduct: {
        select: {
          title: true,
          totalCount: true,
          time: true,
          price: true,
        },
      },
      trainer: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              username: true,
              mobile: true,
            },
          },
        },
      },
    },
  });

  // CONFIRMED 상태의 PT 조회 (최대 1개)
  const confirmedPt = await prisma.pt.findFirst({
    where: {
      memberId,
      state: PtState.CONFIRMED,
      trainerConfirmed: true,
    },
    select: {
      id: true,
      startDate: true,
      description: true,
      ptProduct: {
        select: {
          title: true,
          totalCount: true,
          time: true,
          price: true,
        },
      },
      trainer: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              username: true,
              mobile: true,
            },
          },
        },
      },
      ptRecord: {
        select: {
          id: true,
          ptSchedule: {
            select: {
              date: true,
              startTime: true,
              endTime: true,
            },
          },
          items: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  // PT 진행 상태 계산
  let ptProgress: MemberDashboardStats["ptProgress"] = null;
  let nextSession: MemberDashboardStats["nextSession"] = null;
  let totalSessions = 0;
  let thisMonthSessions = 0;

  if (confirmedPt) {
    // 완료된 세션 수 계산
    const completedSessions = calculateCompletedSessions(
      confirmedPt.ptRecord.map((record) => ({
        ptSchedule: record.ptSchedule,
        items: record.items,
      })),
      currentTime
    );

    ptProgress = {
      completed: completedSessions,
      total: confirmedPt.ptProduct.totalCount,
      percentage: Math.round(
        (completedSessions / confirmedPt.ptProduct.totalCount) * 100
      ),
    };

    // 총 세션 수
    totalSessions = completedSessions;

    // 이번 달 세션 수
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const thisMonthRecords = confirmedPt.ptRecord.filter(
      (record) => new Date(record.ptSchedule.date) >= thisMonthStart
    );

    thisMonthSessions = calculateCompletedSessions(
      thisMonthRecords.map((record) => ({
        ptSchedule: record.ptSchedule,
        items: record.items,
      })),
      currentTime
    );

    // 가장 가까운 미래 수업 찾기
    const nextSessionRecord = await prisma.ptRecord.findFirst({
      where: {
        ptId: confirmedPt.id,
        ptSchedule: {
          date: {
            gt: new Date(),
          },
        },
      },
      select: {
        id: true,
        ptSchedule: {
          select: {
            date: true,
            startTime: true,
            endTime: true,
          },
        },
        items: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        ptSchedule: {
          date: "asc",
        },
      },
    });

    if (nextSessionRecord) {
      const status = calculateAttendanceStatus(
        {
          ptSchedule: nextSessionRecord.ptSchedule,
          items: nextSessionRecord.items,
        },
        currentTime
      );

      if (status === "RESERVED") {
        // 다음 수업이 몇 번째 수업인지 계산
        const sessionNumber = completedSessions + 1;

        nextSession = {
          id: nextSessionRecord.id,
          date: nextSessionRecord.ptSchedule.date.toISOString(),
          startTime: formatTime(nextSessionRecord.ptSchedule.startTime),
          endTime: formatTime(nextSessionRecord.ptSchedule.endTime),
          ptTitle: confirmedPt.ptProduct.title,
          trainerName: confirmedPt.trainer?.user.username || "트레이너 미배정",
          sessionNumber,
        };
      }
    }
  }

  // 대기 중인 일정 변경 요청 확인
  let pendingScheduleChange: MemberDashboardStats["pendingScheduleChange"] =
    null;

  if (confirmedPt) {
    const pendingChangeRequest = await prisma.ptScheduleChangeRequest.findFirst(
      {
        where: {
          ptRecord: {
            ptId: confirmedPt.id,
          },
          state: "PENDING",
        },
        select: {
          ptRecordId: true,
        },
      }
    );

    if (pendingChangeRequest) {
      const changeRequestCount = await prisma.ptScheduleChangeRequest.count({
        where: {
          ptRecord: {
            ptId: confirmedPt.id,
          },
          state: "PENDING",
        },
      });

      pendingScheduleChange = {
        ptRecordId: pendingChangeRequest.ptRecordId,
        count: changeRequestCount,
      };
    }
  }

  const result: MemberDashboardStats = {
    pendingPt: pendingPt
      ? {
          id: pendingPt.id,
          startDate: pendingPt.startDate.toISOString(),
          description: pendingPt.description,
          ptProduct: pendingPt.ptProduct,
          trainerName: pendingPt.trainer?.user.username || "트레이너 미배정",
          trainerPhone: pendingPt.trainer?.user.mobile || null,
          trainerId: pendingPt.trainer?.id || "",
          trainerUserId: pendingPt.trainer?.user.id || "",
        }
      : null,
    confirmedPt: confirmedPt
      ? {
          id: confirmedPt.id,
          startDate: confirmedPt.startDate.toISOString(),
          description: confirmedPt.description,
          ptProduct: confirmedPt.ptProduct,
          trainerName: confirmedPt.trainer?.user.username || "트레이너 미배정",
          trainerPhone: confirmedPt.trainer?.user.mobile || null,
          trainerId: confirmedPt.trainer?.id || "",
          trainerUserId: confirmedPt.trainer?.user.id || "",
        }
      : null,
    ptProgress,
    totalSessions,
    thisMonthSessions,
    nextSession,
    pendingScheduleChange,
  };

  return result;
}

// 타입 추론 활용
export type GetMemberDashboardStatsResult = Awaited<
  ReturnType<typeof getMemberDashboardStats>
>;
