import prisma from '@/app/lib/prisma';

// 머신 세트 일괄 생성
export async function createMachineSetRecords(data: {
  ptRecordId: string;
  machineName: string;
  details?: string;
  entry?: number;
  machineSetRecords: Array<{
    reps: number;
    set: number;
    settingValueIds: string[];
  }>;
}) {
  // 트랜잭션으로 모든 세트 기록을 한 번에 생성
  return await prisma.$transaction(async (tx) => {
    // 1. PtRecordItem 생성
    const ptRecordItem = await tx.ptRecordItem.create({
      data: {
        ptRecordId: data.ptRecordId,
        type: "MACHINE",
        title: data.machineName,
        description: data.details,
        entry: data.entry || 0,
      },
    });

    // 2. 각 세트별로 MachineSetRecord 생성
    const machineSetRecordsCreated = await Promise.all(
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
      machineSetRecords: machineSetRecordsCreated,
    };
  });
}

// 프리웨이트 세트 기록 생성
export async function createFreeSetRecord(data: {
  ptRecordItemId: string;
  freeExerciseId: string;
  reps: number;
  set: number;
  equipmentIds: string[];
}) {
  if (!data.freeExerciseId) {
    throw new Error("freeExerciseId가 필요합니다.");
  }

  if (!data.equipmentIds || !Array.isArray(data.equipmentIds)) {
    throw new Error("equipmentIds가 필요합니다.");
  }

  return await prisma.freeSetRecord.create({
    data: {
      reps: data.reps,
      set: data.set,
      ptRecordItemId: data.ptRecordItemId,
      freeExerciseId: data.freeExerciseId,
      equipments: {
        connect: data.equipmentIds.map((equipmentId) => ({
          id: equipmentId,
        })),
      },
    },
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
  });
}

// 스트레칭 기록 생성
export async function createStretchingRecord(data: {
  ptRecordItemId: string;
  stretchingExerciseId: string;
  description?: string;
  equipmentIds?: string[];
}) {
  if (!data.ptRecordItemId || !data.stretchingExerciseId) {
    throw new Error("ptRecordItemId와 stretchingExerciseId가 필요합니다.");
  }

  return await prisma.stretchingExerciseRecord.create({
    data: {
      ptRecordItemId: data.ptRecordItemId,
      stretchingExerciseId: data.stretchingExerciseId,
      description: data.description,
      equipments:
        data.equipmentIds && data.equipmentIds.length > 0
          ? {
              connect: data.equipmentIds.map((equipmentId) => ({
                id: equipmentId,
              })),
            }
          : undefined,
    },
    select: {
      id: true,
      description: true,
      stretchingExercise: {
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
  });
}

// 프리웨이트 세트 기록 조회
export async function getFreeSetRecords(ptRecordItemId: string) {
  return await prisma.freeSetRecord.findMany({
    where: {
      ptRecordItemId,
    },
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
  });
}

// 스트레칭 기록 조회
export async function getStretchingRecords(ptRecordItemId: string) {
  return await prisma.stretchingExerciseRecord.findMany({
    where: {
      ptRecordItemId,
    },
    select: {
      id: true,
      description: true,
      stretchingExercise: {
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
  });
}

// 타입 추론
export type CreateMachineSetRecordsResult = Awaited<ReturnType<typeof createMachineSetRecords>>;
export type CreateFreeSetRecordResult = Awaited<ReturnType<typeof createFreeSetRecord>>;
export type CreateStretchingRecordResult = Awaited<ReturnType<typeof createStretchingRecord>>;
export type GetFreeSetRecordsResult = Awaited<ReturnType<typeof getFreeSetRecords>>;
export type GetStretchingRecordsResult = Awaited<ReturnType<typeof getStretchingRecords>>;