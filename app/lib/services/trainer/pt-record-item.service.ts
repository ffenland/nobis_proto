import prisma from '@/app/lib/prisma';
import { ItemType } from '@prisma/client';

// PT Record Item 생성
export async function createPtRecordItem(data: {
  ptRecordId: string;
  type: ItemType;
  title: string;
  description?: string;
  entry?: number;
}) {
  return await prisma.ptRecordItem.create({
    data: {
      ptRecordId: data.ptRecordId,
      type: data.type,
      title: data.title,
      description: data.description,
      entry: data.entry || 0,
    },
    select: {
      id: true,
      ptRecordId: true,
      type: true,
      title: true,
      description: true,
      entry: true,
      createdAt: true,
    }
  });
}

// 타입 추론
export type CreatePtRecordItemResult = Awaited<ReturnType<typeof createPtRecordItem>>;

// 소프트 삭제 구현
export async function softDeletePtRecordItem(
  itemId: string, 
  deletedBy: string
) {
  return await prisma.ptRecordItem.update({
    where: { id: itemId },
    data: {
      deletedAt: new Date(),
      deletedBy,
    },
    select: {
      id: true,
      ptRecordId: true,
      deletedAt: true,
      entry: true,
    }
  });
}

// 타입 추론
export type SoftDeleteResult = Awaited<ReturnType<typeof softDeletePtRecordItem>>;

// 활성 아이템만 조회하도록 수정
export async function getActivePtRecordItems(ptRecordId: string) {
  return await prisma.ptRecordItem.findMany({
    where: {
      ptRecordId,
      deletedAt: null, // 삭제되지 않은 것만
    },
    select: {
      id: true,
      title: true,
      description: true,
      entry: true,
      type: true,
      createdAt: true,
    },
    orderBy: {
      entry: 'asc',
    }
  });
}

// 삭제 전 아이템 상세 정보 가져오기 (로그용)
export async function getPtRecordItemDetailForAudit(itemId: string) {
  return await prisma.ptRecordItem.findUnique({
    where: { id: itemId },
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
              value: true,
              machineSetting: {
                select: {
                  title: true,
                  machine: {
                    select: {
                      title: true,
                    }
                  }
                }
              }
            }
          }
        }
      },
      freeSetRecords: {
        select: {
          id: true,
          set: true,
          reps: true,
          freeExercise: {
            select: {
              title: true,
            }
          },
          equipments: {
            select: {
              title: true,
            }
          }
        }
      },
      stretchingExerciseRecords: {
        select: {
          id: true,
          description: true,
          stretchingExercise: {
            select: {
              title: true,
            }
          },
          equipments: {
            select: {
              title: true,
            }
          }
        }
      },
    }
  });
}

// 남은 아이템들의 entry 재정렬
export async function reorderPtRecordItems(ptRecordId: string) {
  const remainingItems = await prisma.ptRecordItem.findMany({
    where: { 
      ptRecordId,
      deletedAt: null // 삭제되지 않은 것만
    },
    orderBy: { entry: 'asc' },
    select: {
      id: true,
      entry: true,
    }
  });

  // entry 값을 0부터 순차적으로 재배열
  const updatePromises = remainingItems.map((item, index) => 
    prisma.ptRecordItem.update({
      where: { id: item.id },
      data: { entry: index },
    })
  );

  await Promise.all(updatePromises);
  
  return remainingItems.length;
}

// PT Record Item 권한 확인
export async function checkPtRecordItemPermission(
  itemId: string, 
  trainerId: string
) {
  const item = await prisma.ptRecordItem.findFirst({
    where: {
      id: itemId,
      deletedAt: null, // 삭제되지 않은 것만
      ptRecord: {
        pt: {
          trainerId: trainerId,
          state: {
            in: ['CONFIRMED', 'FINISHED'],
          },
        },
      },
    },
    select: {
      id: true,
      ptRecord: {
        select: {
          id: true,
          ptSchedule: {
            select: {
              date: true,
              startTime: true,
              endTime: true,
            }
          }
        }
      }
    }
  });

  return item;
}

// 프리웨이트 PT Record Item 업데이트
export async function updatePtRecordItemFree(data: {
  itemId: string;
  title: string;
  description?: string;
  freeExerciseId: string;
  sets: Array<{
    set: number;
    reps: number;
    equipmentIds: string[];
  }>;
}) {
  // 트랜잭션으로 처리
  return await prisma.$transaction(async (tx) => {
    // 1. PT Record Item 업데이트
    await tx.ptRecordItem.update({
      where: { id: data.itemId },
      data: {
        title: data.title,
        description: data.description,
      },
    });

    // 2. 기존 FreeSetRecord 삭제
    await tx.freeSetRecord.deleteMany({
      where: { ptRecordItemId: data.itemId },
    });

    // 3. 새로운 FreeSetRecord 생성
    for (const setData of data.sets) {
      await tx.freeSetRecord.create({
        data: {
          ptRecordItemId: data.itemId,
          freeExerciseId: data.freeExerciseId,
          set: setData.set,
          reps: setData.reps,
          equipments: {
            connect: setData.equipmentIds.map(id => ({ id })),
          },
        },
      });
    }

    return { success: true };
  });
}

// 머신 PT Record Item 업데이트
export async function updatePtRecordItemMachine(data: {
  itemId: string;
  title: string;
  description?: string;
  sets: Array<{
    set: number;
    reps: number;
    settings: Array<{
      machineSettingId: string;
      value: string;
    }>;
  }>;
}) {
  // 트랜잭션으로 처리
  return await prisma.$transaction(async (tx) => {
    // 1. PT Record Item 업데이트
    await tx.ptRecordItem.update({
      where: { id: data.itemId },
      data: {
        title: data.title,
        description: data.description,
      },
    });

    // 2. 기존 MachineSetRecord 삭제
    await tx.machineSetRecord.deleteMany({
      where: { ptRecordItemId: data.itemId },
    });

    // 3. 새로운 MachineSetRecord 생성
    for (const setData of data.sets) {
      const machineSetRecord = await tx.machineSetRecord.create({
        data: {
          ptRecordItemId: data.itemId,
          set: setData.set,
          reps: setData.reps,
        },
      });

      // 4. MachineSettingValue 생성
      for (const setting of setData.settings) {
        await tx.machineSettingValue.create({
          data: {
            machineSetRecordId: machineSetRecord.id,
            machineSettingId: setting.machineSettingId,
            value: setting.value,
          },
        });
      }
    }

    return { success: true };
  });
}

// 스트레칭 PT Record Item 업데이트
export async function updatePtRecordItemStretching(data: {
  itemId: string;
  stretchingExerciseId: string;
  description?: string;
  equipmentIds: string[];
}) {
  // 트랜잭션으로 처리
  return await prisma.$transaction(async (tx) => {
    // 1. PT Record Item description 업데이트
    await tx.ptRecordItem.update({
      where: { id: data.itemId },
      data: { description: data.description },
    });

    // 2. 기존 StretchingExerciseRecord 삭제
    await tx.stretchingExerciseRecord.deleteMany({
      where: { ptRecordItemId: data.itemId },
    });

    // 3. 새로운 StretchingExerciseRecord 생성
    await tx.stretchingExerciseRecord.create({
      data: {
        ptRecordItemId: data.itemId,
        stretchingExerciseId: data.stretchingExerciseId,
        description: data.description,
        equipments: {
          connect: data.equipmentIds.map(id => ({ id })),
        },
      },
    });

    return { success: true };
  });
}

// PT Record 권한 확인 (트레이너가 해당 PT Record에 접근 가능한지 확인)
export async function checkPtRecordPermission(
  ptRecordId: string,
  trainerId: string
) {
  const ptRecord = await prisma.ptRecord.findFirst({
    where: {
      id: ptRecordId,
      pt: {
        trainerId: trainerId,
        state: {
          in: ['CONFIRMED', 'FINISHED'],
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
        }
      }
    }
  });

  return ptRecord;
}

// 타입 추론들
export type UpdatePtRecordItemFreeResult = Awaited<ReturnType<typeof updatePtRecordItemFree>>;
export type UpdatePtRecordItemMachineResult = Awaited<ReturnType<typeof updatePtRecordItemMachine>>;
export type UpdatePtRecordItemStretchingResult = Awaited<ReturnType<typeof updatePtRecordItemStretching>>;
export type CheckPtRecordItemPermissionResult = Awaited<ReturnType<typeof checkPtRecordItemPermission>>;
export type CheckPtRecordPermissionResult = Awaited<ReturnType<typeof checkPtRecordPermission>>;