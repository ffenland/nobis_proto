// app/lib/services/machine.service.ts
"use server";

import prisma from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// 머신 상세 조회 타입
export type MachineDetail = Prisma.PromiseReturnType<typeof getMachineDetail>;

// 머신 업데이트 타입
export type MachineUpdateData = {
  title?: string;
  machineSetting?: {
    id?: string;
    title: string;
    unit: string;
    isNew?: boolean;
    values: {
      id?: string;
      value: string;
      isNew?: boolean;
    }[];
  }[];
};

// 머신 상세 정보 조회
export const getMachineDetail = async (machineId: string) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다.");
  }

  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
    select: {
      id: true,
      title: true,
      fitnessCenter: {
        select: {
          id: true,
          title: true,
        },
      },
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
            orderBy: {
              value: "asc",
            },
          },
        },
        orderBy: {
          title: "asc",
        },
      },
      photos: {
        select: {
          id: true,
          publicUrl: true,
        },
        take: 5,
      },
    },
  });

  if (!machine) {
    throw new Error("머신을 찾을 수 없습니다.");
  }

  return machine;
};

// 머신 정보 업데이트
export const updateMachineDetail = async (
  machineId: string,
  updateData: MachineUpdateData
) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다.");
  }

  // 트랜잭션으로 처리
  const result = await prisma.$transaction(async (tx) => {
    // 1. 머신 제목 업데이트 (있는 경우)
    if (updateData.title) {
      await tx.machine.update({
        where: { id: machineId },
        data: { title: updateData.title },
      });
    }

    // 2. 머신 설정 처리
    if (updateData.machineSetting) {
      for (const setting of updateData.machineSetting) {
        if (setting.isNew) {
          // 새로운 설정 생성
          const newSetting = await tx.machineSetting.create({
            data: {
              machineId,
              title: setting.title,
              unit: setting.unit,
            },
          });

          // 새로운 설정의 값들 생성
          if (setting.values.length > 0) {
            await tx.machineSettingValue.createMany({
              data: setting.values.map((value) => ({
                machineSettingId: newSetting.id,
                value: value.value,
              })),
            });
          }
        } else if (setting.id) {
          // 기존 설정 업데이트
          await tx.machineSetting.update({
            where: { id: setting.id },
            data: {
              title: setting.title,
              unit: setting.unit,
            },
          });

          // 기존 값들 삭제 후 새로 생성 (단순화를 위해)
          await tx.machineSettingValue.deleteMany({
            where: { machineSettingId: setting.id },
          });

          if (setting.values.length > 0) {
            await tx.machineSettingValue.createMany({
              data: setting.values.map((value) => ({
                machineSettingId: setting.id!,
                value: value.value,
              })),
            });
          }
        }
      }
    }

    // 3. 업데이트된 머신 정보 반환
    return await tx.machine.findUnique({
      where: { id: machineId },
      select: {
        id: true,
        title: true,
        fitnessCenter: {
          select: {
            id: true,
            title: true,
          },
        },
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
              orderBy: {
                value: "asc",
              },
            },
          },
          orderBy: {
            title: "asc",
          },
        },
      },
    });
  });

  // 캐시 재검증
  revalidatePath(`/manager/centers/*/machines/${machineId}`);

  return result;
};

// 머신 삭제
export const deleteMachine = async (machineId: string) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다.");
  }

  // 머신 존재 확인
  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
    select: {
      id: true,
      fitnessCenterId: true,
    },
  });

  if (!machine) {
    throw new Error("머신을 찾을 수 없습니다.");
  }

  // 트랜잭션으로 모든 관련 데이터 삭제
  await prisma.$transaction(async (tx) => {
    // 1. 머신 설정 값들 삭제
    await tx.machineSettingValue.deleteMany({
      where: {
        machineSetting: {
          machineId,
        },
      },
    });

    // 2. 머신 설정들 삭제
    await tx.machineSetting.deleteMany({
      where: { machineId },
    });

    // 3. 관련 미디어 삭제 (사진 등)
    await tx.media.deleteMany({
      where: { machineId },
    });

    // 4. 머신 삭제
    await tx.machine.delete({
      where: { id: machineId },
    });
  });

  // 캐시 재검증
  if (machine.fitnessCenterId) {
    revalidatePath(`/manager/centers/${machine.fitnessCenterId}/machines`);
  }

  return { success: true };
};

// 머신 설정 삭제
export const deleteMachineSetting = async (settingId: string) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다.");
  }

  const setting = await prisma.machineSetting.findUnique({
    where: { id: settingId },
    select: {
      id: true,
      machineId: true,
      machine: {
        select: {
          fitnessCenterId: true,
        },
      },
    },
  });

  if (!setting) {
    throw new Error("설정을 찾을 수 없습니다.");
  }

  // 트랜잭션으로 설정과 관련 값들 삭제
  await prisma.$transaction(async (tx) => {
    // 1. 설정 값들 삭제
    await tx.machineSettingValue.deleteMany({
      where: { machineSettingId: settingId },
    });

    // 2. 설정 삭제
    await tx.machineSetting.delete({
      where: { id: settingId },
    });
  });

  // 캐시 재검증
  if (setting.machine.fitnessCenterId) {
    revalidatePath(
      `/manager/centers/${setting.machine.fitnessCenterId}/machines/${setting.machineId}`
    );
  }

  return { success: true };
};
