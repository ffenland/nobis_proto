// app/lib/services/pt-record.service.ts
import prisma from "@/app/lib/prisma";
import { cache } from "react";

// PT Record 상세 정보 조회 서비스 (기록 여부와 상관없이 전체 정보)
export const getPtRecordDetailService = async (ptRecordId: string) => {
  const ptRecord = await prisma.ptRecord.findUnique({
    where: { id: ptRecordId },
    select: {
      id: true,
      memo: true,
      createdAt: true,
      updatedAt: true,
      pt: {
        select: {
          id: true,
          ptProduct: {
            select: {
              title: true,
              totalCount: true,
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
          trainer: {
            select: {
              fitnessCenterId: true,
              fitnessCenter: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      },
      ptSchedule: {
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
        },
      },
      fitnessCeneter: {
        select: {
          id: true,
          title: true,
        },
      },
      items: {
        select: {
          id: true,
          entry: true,
          description: true,
          type: true,
          title: true,
          isActive: true,
          photos: {
            select: {
              id: true,
              publicUrl: true,
              thumbnailUrl: true,
              type: true,
            },
          },
          machineSetRecords: {
            select: {
              id: true,
              reps: true,
              set: true,
              createdAt: true,
              settingValues: {
                select: {
                  id: true,
                  value: true,
                  machineSetting: {
                    select: {
                      id: true,
                      title: true,
                      unit: true,
                      machine: {
                        select: {
                          id: true,
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
              createdAt: true,
              weights: {
                select: {
                  id: true,
                  title: true,
                  weight: true,
                  unit: true,
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
              createdAt: true,
              stretchingExercise: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                },
              },
            },
          },
        },
        orderBy: {
          entry: "asc",
        },
      },
    },
  });

  if (!ptRecord) {
    throw new Error("PT 기록을 찾을 수 없습니다.");
  }

  return ptRecord;
};

// PT Record 기본 정보 조회 서비스 (기존 로직 유지)
export const getPtRecordInfoService = async (ptRecordId: string) => {
  const ptRecord = await prisma.ptRecord.findUnique({
    where: { id: ptRecordId },
    select: {
      id: true,
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
          trainer: {
            select: {
              fitnessCenterId: true,
              fitnessCenter: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      },
      ptSchedule: {
        select: {
          date: true,
          startTime: true,
          endTime: true,
        },
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
  });

  if (!ptRecord) {
    throw new Error("PT 기록을 찾을 수 없습니다.");
  }

  return ptRecord;
};

// PT Record Items 조회 서비스 (기존 로직 유지)
export const getPtRecordItemsService = async (ptRecordId: string) => {
  const ptRecordItems = await prisma.ptRecord.findUnique({
    where: { id: ptRecordId },
    select: {
      items: {
        select: {
          id: true,
          title: true,
          description: true,
          entry: true,
          type: true,
          freeSetRecords: {
            select: {
              weights: true,
              id: true,
              reps: true,
              set: true,
            },
          },
          machineSetRecords: {
            select: {
              id: true,
              reps: true,
              set: true,
              settingValues: {
                select: {
                  id: true,
                  value: true,
                  machineSetting: {
                    select: {
                      id: true,
                      title: true,
                      unit: true,
                      machine: {
                        select: {
                          id: true,
                          title: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          stretchingExerciseRecords: {
            select: {
              id: true,
              stretchingExercise: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return ptRecordItems;
};

// 머신 목록 조회 서비스 (기존 로직 유지)
export const getMachinesService = cache(async (centerId: string) => {
  const machines = await prisma.machine.findMany({
    where: {
      fitnessCenterId: centerId,
    },
    select: {
      id: true,
      title: true,
      machineSetting: {
        select: {
          id: true,
          title: true,
          unit: true,
          values: {
            select: {
              id: true,
              value: true,
            },
          },
        },
      },
    },
  });
  return machines;
});

// 도구 목록 조회 서비스 (기존 로직 유지)
export const getWeightsListService = cache(async (centerId: string) => {
  const weights = await prisma.weights.findMany({
    where: {
      fitnessCenterId: centerId,
    },
    select: {
      id: true,
      title: true,
      weight: true,
      description: true,
    },
  });

  return weights;
});

// 피트니스 센터 목록 조회 서비스 (기존 로직 유지)
export const getFitnessCentersService = async () => {
  const centers = await prisma.fitnessCenter.findMany({
    select: {
      id: true,
      title: true,
    },
  });
  return centers;
};

// 스트레칭 운동 목록 조회 서비스 (기존 로직 유지)
export const getStretchingExercisesService = async () => {
  const exercises = await prisma.stretchingExercise.findMany({
    select: {
      id: true,
      title: true,
      description: true,
    },
    orderBy: {
      title: "asc",
    },
  });
  return exercises;
};

// 90분 제한 체크 유틸리티 함수
export const checkTimeLimit = (
  scheduleDate: Date,
  startTime: number
): boolean => {
  const now = new Date();
  const classDate = new Date(scheduleDate);

  // 시간 변환 (예: 1430 -> 14시 30분)
  const hour = Math.floor(startTime / 100);
  const minute = startTime % 100;

  const classStart = new Date(classDate);
  classStart.setHours(hour, minute, 0, 0);

  // 90분 후 시간 계산
  const timeLimit = new Date(classStart);
  timeLimit.setMinutes(timeLimit.getMinutes() + 90);

  return now > timeLimit;
};

// 타입 추론을 위한 타입 정의
export type IPtRecordDetail = NonNullable<
  Awaited<ReturnType<typeof getPtRecordDetailService>>
>;
export type IPtRecordInfo = NonNullable<
  Awaited<ReturnType<typeof getPtRecordInfoService>>
>;
export type IPtRecordItems = NonNullable<
  Awaited<ReturnType<typeof getPtRecordItemsService>>
>;
export type IPtRecordItem = NonNullable<
  Awaited<ReturnType<typeof getPtRecordItemsService>>
>["items"][number];
export type IMachine = Awaited<ReturnType<typeof getMachinesService>>[number];
export type IWeights = Awaited<
  ReturnType<typeof getWeightsListService>
>[number];
export type IFitnessCenter = Awaited<
  ReturnType<typeof getFitnessCentersService>
>[number];
export type IStretchingExercise = Awaited<
  ReturnType<typeof getStretchingExercisesService>
>[number];
