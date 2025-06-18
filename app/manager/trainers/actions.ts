"use server";

import prisma from "@/app/lib/prisma";

export interface ITrainerInfo {
  id: string;
  username: string;
  center: string;
  ptCount: number;
}

export const getTrainerForManager = async () => {
  const trainers = await prisma.trainer.findMany({
    select: {
      id: true,
      user: {
        select: {
          username: true,
        },
      },
      fitnessCenter: {
        select: {
          id: true,
          title: true,
        },
      },
      _count: {
        select: { pt: { where: { isActive: true } } },
      },
    },
  });
  const result: ITrainerInfo[] = [];
  trainers.forEach((trainer) => {
    const fitnessCenter = trainer.fitnessCenter?.title ?? "무소속";
    const ptCount = trainer._count.pt;
    result.push({
      id: trainer.id,
      username: trainer.user.username,
      center: fitnessCenter,
      ptCount,
    });
  });
  result.sort((a, b) => {
    if (a.center === "무소속") return 1;
    if (b.center === "무소속") return -1;
    return a.center.localeCompare(b.center);
  });
  return result;
};
