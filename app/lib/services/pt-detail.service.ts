// app/lib/services/pt-detail.service.ts
import prisma from "@/app/lib/prisma";
import { AttendanceState } from "@prisma/client";

// PT 상세 정보 조회 (회원용)
export const getPtDetailForMemberService = async (
  ptId: string,
  memberId: string
) => {
  // PT 정보 조회
  const pt = await prisma.pt.findUnique({
    where: {
      id: ptId,
    },
    select: {
      id: true,
      ptProduct: {
        select: {
          title: true,
          description: true,
          time: true,
          price: true,
          totalCount: true,
        },
      },
      isRegular: true,
      weekTimes: {
        select: {
          weekDay: true,
          startTime: true,
          endTime: true,
        },
      },
      trainerConfirmed: true,
      isActive: true,
      startDate: true,
      memberId: true,
      trainerId: true,
      trainer: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              username: true,
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
          attended: true,
          items: {
            select: {
              id: true,
              entry: true,
              description: true,
              type: true,
              title: true,
              machineSetRecords: {
                select: {
                  id: true,
                  reps: true,
                  set: true,
                  settingValues: {
                    select: {
                      value: true,
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
                select: {
                  id: true,
                  reps: true,
                  set: true,
                  weights: {
                    select: {
                      title: true,
                      weight: true,
                      unit: true,
                    },
                  },
                },
              },
              stretchingExerciseRecords: {
                select: {
                  id: true,
                  description: true,
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
    },
  });

  if (!pt) {
    throw new Error("PT를 찾을 수 없습니다.");
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
    },
    userId: pt.trainer.user.id,
  };
};

// PT 운동 기록 추가/수정 (향후 확장용)
export const updatePtRecordItemService = async (
  recordId: string,
  items: Array<{
    entry: number;
    type: "MACHINE" | "FREE" | "STRETCHING";
    title?: string;
    description?: string;
  }>
) => {
  const updatedRecord = await prisma.ptRecord.update({
    where: { id: recordId },
    data: {
      items: {
        deleteMany: {}, // 기존 기록 삭제
        createMany: {
          data: items,
        },
      },
    },
    include: {
      items: true,
    },
  });

  return updatedRecord;
};

// PT 출석 상태 업데이트 (트레이너용 - 향후 확장)
export const updateAttendanceService = async (
  recordId: string,
  attended: AttendanceState
) => {
  const updatedRecord = await prisma.ptRecord.update({
    where: { id: recordId },
    data: {
      attended: attended,
    },
  });

  return updatedRecord;
};

// 회원의 모든 PT 요약 통계
export const getMemberPtStatsService = async (memberId: string) => {
  // 전체 PT 개수
  const totalPts = await prisma.pt.count({
    where: { memberId },
  });

  // 진행중인 PT 개수
  const activePts = await prisma.pt.count({
    where: {
      memberId,
      trainerConfirmed: true,
      isActive: true,
    },
  });

  // 총 운동 횟수
  const totalSessions = await prisma.ptRecord.count({
    where: {
      pt: { memberId },
      attended: AttendanceState.ATTENDED,
    },
  });

  // 이번 달 운동 횟수
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  const thisMonthSessions = await prisma.ptRecord.count({
    where: {
      pt: { memberId },
      attended: AttendanceState.ATTENDED,
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
