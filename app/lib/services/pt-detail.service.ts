// app/lib/services/pt-detail.service.ts (PtState 적용 완전 수정 버전)
import prisma from "@/app/lib/prisma";
import { PtState } from "@prisma/client";

// 회원용 PT 상세 조회
export const getPtDetailForMemberService = async (
  ptId: string,
  memberId: string
) => {
  const pt = await prisma.pt.findFirst({
    where: {
      id: ptId,
      memberId,
      // PENDING, CONFIRMED 상태만 조회 가능
      state: {
        in: [PtState.PENDING, PtState.CONFIRMED],
      },
    },
    include: {
      trainer: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      },
      member: {
        include: {
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
          time: true,
          price: true,
          description: true,
        },
      },
      ptRecord: {
        select: {
          id: true,
          attended: true,
          ptSchedule: {
            select: {
              date: true,
              startTime: true,
              endTime: true,
            },
          },
          memo: true,
          items: {
            include: {
              machineSetRecords: {
                include: {
                  settingValues: {
                    include: {
                      machineSetting: {
                        select: {
                          title: true,
                          unit: true,
                        },
                      },
                    },
                  },
                },
              },
              freeSetRecords: {
                include: {
                  weights: true,
                },
              },
              stretchingExerciseRecords: {
                include: {
                  stretchingExercise: {
                    select: {
                      title: true,
                      description: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          ptSchedule: {
            date: "asc",
          },
        },
      },
      weekTimes: {
        select: {
          endTime: true,
          startTime: true,
          id: true,
          weekDay: true,
        },
      },
    },
  });

  if (!pt) {
    throw new Error("PT 정보를 찾을 수 없습니다.");
  }

  // 회원 본인의 PT인지 확인
  if (pt.memberId !== memberId) {
    throw new Error("접근 권한이 없습니다.");
  }

  // 트레이너가 없는 경우 처리
  if (!pt.trainer) {
    throw new Error("트레이너가 배정되지 않았습니다.");
  }

  return {
    pt: {
      ...pt,
      startDate: pt.startDate.toISOString(),
      ptRecord: pt.ptRecord.map((record) => ({
        ...record,
        ptSchedule: {
          ...record.ptSchedule,
          date: record.ptSchedule.date.toISOString(),
        },
      })),
      // 상태 정보 추가
      isPending: pt.state === PtState.PENDING,
      isConfirmed: pt.state === PtState.CONFIRMED,
      isCompleted:
        pt.state === PtState.CONFIRMED &&
        pt.ptRecord.filter((r) => r.attended === "ATTENDED").length >=
          pt.ptProduct.totalCount,
    },
    userId: pt.trainer.user.id,
  };
};

// 회원의 모든 PT 요약 통계
export const getMemberPtStatsService = async (memberId: string) => {
  // 전체 PT 개수
  const totalPts = await prisma.pt.count({
    where: {
      memberId,
      state: {
        in: [PtState.PENDING, PtState.CONFIRMED],
      },
    },
  });

  // 진행중인 PT 개수
  const activePts = await prisma.pt.count({
    where: {
      memberId,
      state: PtState.CONFIRMED,
    },
  });

  // 총 운동 횟수
  const totalSessions = await prisma.ptRecord.count({
    where: {
      pt: {
        memberId,
        state: PtState.CONFIRMED,
      },
      attended: "ATTENDED",
    },
  });

  // 이번 달 운동 횟수
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  const thisMonthSessions = await prisma.ptRecord.count({
    where: {
      pt: {
        memberId,
        state: PtState.CONFIRMED,
      },
      attended: "ATTENDED",
      ptSchedule: {
        date: {
          gte: thisMonthStart,
        },
      },
    },
  });

  return {
    totalPts,
    activePts,
    totalSessions,
    thisMonthSessions,
  };
};

// 타입 추론
export type IPtDetailForMember = Awaited<
  ReturnType<typeof getPtDetailForMemberService>
>;
export type IPtRecordFromPtDetail =
  IPtDetailForMember["pt"]["ptRecord"][number];
export type IPtRecordItemFromPtDetail = IPtRecordFromPtDetail["items"][number];
export type IMemberPtStatsFromPtDetail = Awaited<
  ReturnType<typeof getMemberPtStatsService>
>;
