// app/lib/services/pt-record.service.ts
import prisma from "@/app/lib/prisma";
import { cache } from "react";

// PT Record 상세 정보 조회 서비스
export const getPtRecordInfoService = async (ptRecordId: string) => {
  const ptRecord = await prisma.ptRecord.findUnique({
    where: { id: ptRecordId },
    select: {
      id: true,
      attended: true,
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

// PT Record Items 조회 서비스
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

// 머신 목록 조회 서비스
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

// 도구 목록 조회 서비스
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

// 피트니스 센터 목록 조회 서비스
export const getFitnessCentersService = async () => {
  const centers = await prisma.fitnessCenter.findMany({
    select: {
      id: true,
      title: true,
    },
  });
  return centers;
};

// 스트레칭 운동 목록 조회 서비스
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

// 타입 추론을 위한 타입 정의
export type IPtRecordDetail = NonNullable<
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
