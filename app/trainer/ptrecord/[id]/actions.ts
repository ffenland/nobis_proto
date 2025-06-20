"use server";

import prisma from "@/app/lib/prisma";
import { redirect } from "next/navigation";
import { cache } from "react";

export type IPtRecordDetail = NonNullable<
  Awaited<ReturnType<typeof getPtRecordInfo>>
>;

// PTRecord 상세 정보 조회
export const getPtRecordInfo = async (ptRecordId: string) => {
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
    redirect("/trainer/pt");
  } else {
    return ptRecord;
  }
};

export type IPtRecordItem = NonNullable<
  Awaited<ReturnType<typeof getPtRecordItems>>
>["items"][number];

export const getPtRecordItems = async (ptRecordId: string) => {
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

// 센터 목록 조회
export type IFitnessCenter = NonNullable<
  Awaited<ReturnType<typeof getCenterList>>
>[number];

export const getCenterList = async () => {
  const centers = await prisma.fitnessCenter.findMany({
    select: { id: true, title: true },
  });
  return centers;
};

// 머신 전체 목록 조회
export type IMachine = NonNullable<
  Awaited<ReturnType<typeof getMachines>>
>[number];

export const getMachines = cache(async (centerId: string) => {
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

// 머신 세팅값 조회
export const getMachineSettings = async (machineId: string) => {
  const settings = await prisma.machineSetting.findMany({
    where: { machineId },
  });
  return settings;
};

// 도구 전체 목록 조회
export type IWeights = NonNullable<
  Awaited<ReturnType<typeof getWeightsList>>
>[number];

export const getWeightsList = cache(async (centerId: string) => {
  const freeTools = await prisma.weights.findMany({
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

  return freeTools;
});

// 운동기록 추가
export const addMachineRecord = async (data: {
  ptRecordId: string;
  memberId: string;
  machineSettingId: string;
  machineSettingValue: string;
}) => {};

// 운동기록 수정
export const updateMachineRecord = async (
  id: string,
  data: { machineSettingValue: string }
) => {
  //
};

// 운동기록 삭제
export const deleteMachineRecord = async (id: string) => {
  //
};

// 출석 상태 업데이트
export const updateAttendance = async (
  ptRecordId: string,
  attended: "ATTENDED" | "ABSENT" | "RESERVED"
) => {
  const ptRecord = await prisma.ptRecord.update({
    where: { id: ptRecordId },
    data: { attended },
  });
  return ptRecord;
};

// 머신 세트 기록을 위한 타입 정의
export interface IMachineSetRecord {
  reps: number;
  set: number;
  settingValueIds: string[];
  _meta?: {
    setNumber: number;
    settings: Array<{
      settingId: string;
      valueId: string;
      settingTitle: string;
      value: string;
      unit: string;
    }>;
  };
}

// 머신 기록 데이터 타입 정의
export interface IMachineRecordData {
  machineId: string;
  machineName: string;
  machineSetRecords: IMachineSetRecord[];
  details: string;
  _summary?: {
    totalSets: number;
    formattedDetails: string;
  };
}

// 머신 운동 기록 작성
export const writeMachineRecord = async (
  ptRecordId: string,
  data: IMachineRecordData
) => {
  try {
    // 트랜잭션으로 모든 세트 기록을 한 번에 생성
    const result = await prisma.$transaction(async (tx) => {
      // PtRecordItem 생성
      const ptRecordItem = await tx.ptRecordItem.create({
        data: {
          ptRecordId,
          type: "MACHINE",
          description: data.details,
          entry: 0,
        },
      });

      // 각 세트별로 MachineSetRecord 생성
      const machineSetRecords = await Promise.all(
        data.machineSetRecords.map(async (setRecord) => {
          return tx.machineSetRecord.create({
            data: {
              reps: setRecord.reps,
              set: setRecord.set,
              settingValues: {
                connect: setRecord.settingValueIds.map((valueId) => ({
                  id: valueId,
                })),
              },
              ptRecordItem: {
                connect: {
                  id: ptRecordItem.id,
                },
              },
            },
          });
        })
      );

      return {
        ptRecordItem,
        machineSetRecords,
      };
    });

    return { ok: true, data: result };
  } catch (error) {
    console.error("Error writing machine record:", error);
    return {
      ok: false,
      error: {
        message: "머신 운동 기록 작성 중 오류가 발생했습니다.",
      },
    };
  }
};

// actions.ts에 추가할 함수들

// 프리웨이트 기록 작성
export const writeFreeRecord = async (
  ptRecordId: string,
  data: {
    title: string;
    description?: string;
    sets: Array<{
      reps: number;
      set: number;
      weightIds: string[];
    }>;
  }
) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // PtRecordItem 생성
      const ptRecordItem = await tx.ptRecordItem.create({
        data: {
          ptRecordId,
          type: "FREE",
          title: data.title,
          description: data.description,
          entry: 0,
        },
      });

      // 각 세트별로 FreeSetRecord 생성
      const freeSetRecords = await Promise.all(
        data.sets.map(async (setRecord) => {
          return tx.freeSetRecord.create({
            data: {
              reps: setRecord.reps,
              set: setRecord.set,
              weights: {
                connect: setRecord.weightIds.map((weightId) => ({
                  id: weightId,
                })),
              },
              ptRecordItemId: ptRecordItem.id, // 수정: relation 방식 변경
            },
          });
        })
      );

      return {
        ptRecordItem,
        freeSetRecords,
      };
    });

    return { ok: true, data: result };
  } catch (error) {
    console.error("Error writing free record:", error);
    return {
      ok: false,
      error: {
        message: "프리웨이트 운동 기록 작성 중 오류가 발생했습니다.",
      },
    };
  }
};

// 스트레칭 기록 작성
export const writeStretchingRecord = async (
  ptRecordId: string,
  data: {
    title: string;
    description?: string;
    duration: number; // 초 단위
    stretchingExerciseId?: string;
  }
) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      let stretchingExerciseId = data.stretchingExerciseId;

      // 스트레칭 운동이 없는 경우 새로 생성
      if (!stretchingExerciseId) {
        const stretchingExercise = await tx.stretchingExercise.create({
          data: {
            title: data.title,
            description: data.description || data.title,
          },
        });
        stretchingExerciseId = stretchingExercise.id;
      }

      // PtRecordItem 생성
      const ptRecordItem = await tx.ptRecordItem.create({
        data: {
          ptRecordId,
          type: "STRETCHING",
          title: data.title,
          description: data.description,
          entry: data.duration, // 스트레칭 시간을 entry에 저장
        },
      });

      // StretchingExerciseRecord 생성
      const stretchingExerciseRecord = await tx.stretchingExerciseRecord.create(
        {
          data: {
            ptRecordItemId: ptRecordItem.id,
            stretchingExerciseId: stretchingExerciseId!,
            description: data.description,
          },
        }
      );

      return {
        ptRecordItem,
        stretchingExerciseRecord,
      };
    });

    return { ok: true, data: result };
  } catch (error) {
    console.error("Error writing stretching record:", error);
    return {
      ok: false,
      error: {
        message: "스트레칭 기록 작성 중 오류가 발생했습니다.",
      },
    };
  }
};

// 스트레칭 운동 목록 조회
export const getStretchingExercises = async () => {
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

// 스트레칭 운동 생성
export const createStretchingExercise = async (data: {
  title: string;
  description: string;
}) => {
  const exercise = await prisma.stretchingExercise.create({
    data: {
      title: data.title,
      description: data.description,
    },
  });
  return exercise;
};
