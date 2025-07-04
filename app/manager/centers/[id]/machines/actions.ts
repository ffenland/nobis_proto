// app/manager/centers/[id]/facilities/machine/actions.ts
"use server";

import prisma from "@/app/lib/prisma";
import { getSessionOrRedirect } from "@/app/lib/session";
import { Prisma } from "@prisma/client";

export type ICenterMachines = Prisma.PromiseReturnType<
  typeof getCenterMachines
>;

// 센터의 머신 목록 조회
export const getCenterMachines = async (centerId: string) => {
  const session = await getSessionOrRedirect();

  if (session.role !== "MANAGER") {
    throw new Error("매니저 권한이 필요합니다.");
  }

  // 센터 존재 확인
  const center = await prisma.fitnessCenter.findUnique({
    where: { id: centerId },
    select: { id: true, title: true },
  });

  if (!center) {
    throw new Error("센터를 찾을 수 없습니다.");
  }

  // 머신 목록 조회
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
      photos: {
        select: {
          id: true,
          publicUrl: true,
        },
        take: 1,
      },
    },
    orderBy: {
      title: "asc",
    },
  });

  return {
    center,
    machines,
  };
};
