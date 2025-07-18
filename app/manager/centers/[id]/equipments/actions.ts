"use server";
// app/manager/centers/[id]/equipments/actions.ts

import prisma from "@/app/lib/prisma";
import { getSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

export type ICenterEquipments = Prisma.PromiseReturnType<
  typeof getCenterEquipments
>;

export type IEquipmentListItem = ICenterEquipments["equipments"][number];

// 센터의 장비 목록 조회
export const getCenterEquipments = async (centerId: string) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

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

  // 장비 목록 조회
  const equipments = await prisma.equipment.findMany({
    where: {
      fitnessCenterId: centerId,
    },
    select: {
      id: true,
      title: true,
      category: true,
      primaryValue: true,
      primaryUnit: true,
      quantity: true,
      description: true,
      photos: {
        select: {
          id: true,
          publicUrl: true,
        },
        take: 1,
      },
    },
    orderBy: [{ title: "asc" }],
  });

  return {
    center,
    equipments,
  };
};
