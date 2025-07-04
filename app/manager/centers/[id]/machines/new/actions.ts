"use server";

import prisma from "@/app/lib/prisma";
import { revalidatePath } from "next/cache";

export interface IMachineSetting {
  id: string;
  title: string;
  unit: string;
  values: {
    id: string;
    value: string;
    editState: string;
  }[];
  isNew?: boolean;
}

export interface IMachineDetail {
  id: string;
  title: string;
  machineSetting: IMachineSetting[];
}

export async function createMachine(
  centerId: string,
  data: { title: string; machineSetting: IMachineSetting[] }
) {
  try {
    const machine = await prisma.machine.create({
      data: {
        title: data.title,
        fitnessCenterId: centerId,
        machineSetting: {
          create: data.machineSetting.map((setting) => ({
            title: setting.title,
            unit: setting.unit,
            values: {
              create: setting.values
                .filter((v) => v.value.trim() !== "")
                .map((v) => ({
                  value: v.value,
                })),
            },
          })),
        },
      },
      select: {
        id: true,
      },
    });

    revalidatePath(`/manager/centers/${centerId}/machines/}`);
    return { ok: true, data: { machineId: machine.id } };
  } catch (error) {
    console.error("Error creating machine:", error);
    return {
      ok: false,
      error: { message: "머신 생성 중 오류가 발생했습니다." },
    };
  }
}
