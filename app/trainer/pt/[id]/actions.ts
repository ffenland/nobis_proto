// app/trainer/pt/[id]/actions.ts
"use server";

import prisma from "@/app/lib/prisma";
import { getSessionOrRedirect } from "@/app/lib/session";
import { PtState } from "@prisma/client";

export const getPtDetailAction = async (ptId: string) => {
  const session = await getSessionOrRedirect();

  if (session.role !== "TRAINER") {
    throw new Error("접근 권한이 없습니다.");
  }

  const pt = await prisma.pt.findFirst({
    where: {
      id: ptId,
      trainerId: session.roleId,
      state: {
        in: [PtState.PENDING, PtState.CONFIRMED],
      },
    },
    select: {
      id: true,
      state: true,
      startDate: true,
      isRegular: true,
      description: true,
      trainerConfirmed: true,
      trainer: {
        select: {
          user: {
            select: {
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
          price: true,
        },
      },
      ptRecord: {
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
                  settingValues: {
                    select: {
                      id: true,
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
      weekTimes: {
        select: {
          id: true,
          weekDay: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  });

  if (!pt) {
    throw new Error("PT 정보를 찾을 수 없습니다.");
  }

  if (!pt.member) {
    throw new Error("회원이 배정되지 않았습니다.");
  }

  return pt;
};

// 타입 추론을 위한 타입 유틸리티
export type TPtDetail = Awaited<ReturnType<typeof getPtDetailAction>>;
export type TPtRecord = TPtDetail["ptRecord"][number];
export type TPtRecordItem = TPtRecord["items"][number];
