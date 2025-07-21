"use server";

import prisma from "@/app/lib/prisma";
import { getSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { PtState } from "@prisma/client";
import { revalidatePath } from "next/cache";

// 개별 PT 기록 아이템 조회
export const getPtRecordItemAction = async (itemId: string) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TRAINER") {
    throw new Error("접근 권한이 없습니다.");
  }

  const item = await prisma.ptRecordItem.findFirst({
    where: {
      id: itemId,
      ptRecord: {
        pt: {
          trainerId: session.roleId,
          state: {
            in: [PtState.CONFIRMED, PtState.FINISHED],
          },
        },
      },
    },
    include: {
      ptRecord: {
        include: {
          pt: {
            include: {
              member: {
                include: {
                  user: {
                    select: {
                      username: true,
                    },
                  },
                },
              },
            },
          },
          ptSchedule: true,
        },
      },
      machineSetRecords: {
        include: {
          settingValues: {
            include: {
              machineSetting: {
                include: {
                  machine: true,
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
        include: {
          equipments: true,
        },
        orderBy: {
          set: "asc",
        },
      },
      stretchingExerciseRecords: {
        include: {
          stretchingExercise: true,
          equipments: true,
        },
      },
    },
  });

  if (!item) {
    throw new Error("운동 기록 항목을 찾을 수 없습니다.");
  }

  return item;
};

// 머신 운동 기록 수정
export const updateMachineRecordAction = async (
  itemId: string,
  formData: FormData
) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TRAINER") {
    throw new Error("접근 권한이 없습니다.");
  }

  // 기본 정보 추출
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;

  // 세트 데이터 추출
  const setData: {
    id?: string;
    set: number;
    reps: number;
    settingValues: { settingValueId: string; value: string }[];
  }[] = [];

  // FormData에서 세트 정보 파싱
  const setCount = parseInt(formData.get("setCount") as string) || 0;
  
  for (let i = 0; i < setCount; i++) {
    const setId = formData.get(`sets[${i}].id`) as string;
    const set = parseInt(formData.get(`sets[${i}].set`) as string);
    const reps = parseInt(formData.get(`sets[${i}].reps`) as string);
    
    // 설정값 추출 - 기존 settingValue 레코드의 ID와 새 값
    const settingValues: { settingValueId: string; value: string }[] = [];
    let settingIndex = 0;
    while (formData.has(`sets[${i}].settings[${settingIndex}].settingValueId`)) {
      const settingValueId = formData.get(`sets[${i}].settings[${settingIndex}].settingValueId`) as string;
      const value = formData.get(`sets[${i}].settings[${settingIndex}].value`) as string;
      
      settingValues.push({ settingValueId, value });
      settingIndex++;
    }

    setData.push({
      id: setId || undefined,
      set,
      reps,
      settingValues,
    });
  }

  // 트랜잭션으로 업데이트 처리
  await prisma.$transaction(async (tx) => {
    // 1. 기본 정보 업데이트
    await tx.ptRecordItem.update({
      where: { id: itemId },
      data: {
        title: title || undefined,
        description: description || undefined,
      },
    });

    // 2. 세트별 기록 업데이트
    for (const setRecord of setData) {
      if (setRecord.id) {
        // 기존 세트 기록 업데이트
        await tx.machineSetRecord.update({
          where: { id: setRecord.id },
          data: {
            reps: setRecord.reps,
          },
        });

        // 3. 각 설정값 업데이트
        for (const setting of setRecord.settingValues) {
          await tx.machineSettingValue.update({
            where: { id: setting.settingValueId },
            data: {
              value: setting.value,
            },
          });
        }
      }
    }
  });

  // 캐시 재검증 및 리다이렉트
  const item = await getPtRecordItemAction(itemId);
  revalidatePath(`/trainer/pt/${item.ptRecord.pt.id}/${item.ptRecord.id}/edit`);
  redirect(`/trainer/pt/${item.ptRecord.pt.id}/${item.ptRecord.id}/edit`);
};

// 프리웨이트 운동 기록 수정
export const updateFreeRecordAction = async (
  itemId: string,
  formData: FormData
) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TRAINER") {
    throw new Error("접근 권한이 없습니다.");
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;

  // 세트 데이터 추출
  const setData: {
    id?: string;
    set: number;
    reps: number;
    equipmentIds: string[];
  }[] = [];

  const setCount = parseInt(formData.get("setCount") as string) || 0;
  
  for (let i = 0; i < setCount; i++) {
    const setId = formData.get(`sets[${i}].id`) as string;
    const set = parseInt(formData.get(`sets[${i}].set`) as string);
    const reps = parseInt(formData.get(`sets[${i}].reps`) as string);
    
    // 기구 ID 추출
    const equipmentIds: string[] = [];
    let equipmentIndex = 0;
    while (formData.has(`sets[${i}].equipments[${equipmentIndex}]`)) {
      const equipmentId = formData.get(`sets[${i}].equipments[${equipmentIndex}]`) as string;
      equipmentIds.push(equipmentId);
      equipmentIndex++;
    }

    setData.push({
      id: setId || undefined,
      set,
      reps,
      equipmentIds,
    });
  }

  // 트랜잭션으로 업데이트 처리
  await prisma.$transaction(async (tx) => {
    // 1. 기본 정보 업데이트
    await tx.ptRecordItem.update({
      where: { id: itemId },
      data: {
        title: title || undefined,
        description: description || undefined,
      },
    });

    // 2. 기존 세트 기록 삭제
    await tx.freeSetRecord.deleteMany({
      where: { ptRecordItemId: itemId },
    });

    // 3. 새로운 세트 기록 생성
    for (const setRecord of setData) {
      await tx.freeSetRecord.create({
        data: {
          ptRecordItemId: itemId,
          set: setRecord.set,
          reps: setRecord.reps,
          equipments: {
            connect: setRecord.equipmentIds.map(id => ({ id })),
          },
        },
      });
    }
  });

  // 캐시 재검증 및 리다이렉트
  const item = await getPtRecordItemAction(itemId);
  revalidatePath(`/trainer/pt/${item.ptRecord.pt.id}/${item.ptRecord.id}/edit`);
  redirect(`/trainer/pt/${item.ptRecord.pt.id}/${item.ptRecord.id}/edit`);
};

// 스트레칭 운동 기록 수정
export const updateStretchingRecordAction = async (
  itemId: string,
  formData: FormData
) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TRAINER") {
    throw new Error("접근 권한이 없습니다.");
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const exerciseId = formData.get("exerciseId") as string;

  // 기구 ID 추출
  const equipmentIds: string[] = [];
  let equipmentIndex = 0;
  while (formData.has(`equipments[${equipmentIndex}]`)) {
    const equipmentId = formData.get(`equipments[${equipmentIndex}]`) as string;
    equipmentIds.push(equipmentId);
    equipmentIndex++;
  }

  // 트랜잭션으로 업데이트 처리
  await prisma.$transaction(async (tx) => {
    // 1. 기본 정보 업데이트
    await tx.ptRecordItem.update({
      where: { id: itemId },
      data: {
        title: title || undefined,
        description: description || undefined,
      },
    });

    // 2. 기존 스트레칭 기록 삭제
    await tx.stretchingExerciseRecord.deleteMany({
      where: { ptRecordItemId: itemId },
    });

    // 3. 새로운 스트레칭 기록 생성
    await tx.stretchingExerciseRecord.create({
      data: {
        ptRecordItemId: itemId,
        stretchingExerciseId: exerciseId,
        description: description || undefined,
        equipments: {
          connect: equipmentIds.map(id => ({ id })),
        },
      },
    });
  });

  // 캐시 재검증 및 리다이렉트
  const item = await getPtRecordItemAction(itemId);
  revalidatePath(`/trainer/pt/${item.ptRecord.pt.id}/${item.ptRecord.id}/edit`);
  redirect(`/trainer/pt/${item.ptRecord.pt.id}/${item.ptRecord.id}/edit`);
};

// 타입 추론을 위한 타입 유틸리티
export type TPtRecordItem = Awaited<ReturnType<typeof getPtRecordItemAction>>;