// app/lib/services/pt-record-detail.service.ts
import prisma from "@/app/lib/prisma";
import { PtState } from "@prisma/client";

// 멤버용 PT 기록 상세 조회
export const getPtRecordDetailForMemberService = async (
  ptRecordId: string,
  memberId: string
) => {
  const ptRecord = await prisma.ptRecord.findFirst({
    where: {
      id: ptRecordId,
      pt: {
        memberId,
        state: {
          in: [PtState.CONFIRMED, PtState.PENDING],
        },
      },
    },
    select: {
      id: true,
      memo: true,
      ptSchedule: {
        select: {
          date: true,
          startTime: true,
          endTime: true,
        },
      },
      scheduleChangeRequest: {
        where: {
          state: "PENDING",
        },
        select: {
          id: true,
          requestedDate: true,
          requestedStartTime: true,
          requestedEndTime: true,
          reason: true,
          createdAt: true,
          requestor: {
            select: {
              id: true,
              role: true,
              username: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
      items: {
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          entry: true,
          machineSetRecords: {
            select: {
              id: true,
              set: true,
              reps: true,
              settingValues: {
                select: {
                  id: true,
                  value: true,
                  machineSetting: {
                    select: {
                      title: true,
                      unit: true,
                      machine: {
                        select: {
                          title: true,
                        },
                      },
                    },
                  },
                },
              },
            },
            orderBy: {
              set: "asc",
            },
          },
          freeSetRecords: {
            select: {
              id: true,
              reps: true,
              set: true,
              freeExercise: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                },
              },
              equipments: {
                select: {
                  id: true,
                  title: true,
                  category: true,
                  primaryValue: true,
                  primaryUnit: true,
                },
              },
            },
            orderBy: {
              set: "asc",
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
              equipments: {
                select: {
                  id: true,
                  title: true,
                  category: true,
                  primaryValue: true,
                  primaryUnit: true,
                },
              },
            },
          },
        },
        orderBy: {
          entry: "asc",
        },
      },
      pt: {
        select: {
          id: true,
          state: true,
          memberId: true,
          trainer: {
            select: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
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
          ptProduct: {
            select: {
              title: true,
              totalCount: true,
              time: true,
            },
          },
        },
      },
    },
  });

  if (!ptRecord) {
    throw new Error("운동 기록을 찾을 수 없습니다.");
  }

  // 회원 본인의 PT인지 확인
  if (ptRecord.pt.memberId !== memberId) {
    throw new Error("접근 권한이 없습니다.");
  }

  return ptRecord;
};

// 타입 추론
export type IPtRecordDetailForMember = Awaited<
  ReturnType<typeof getPtRecordDetailForMemberService>
>;