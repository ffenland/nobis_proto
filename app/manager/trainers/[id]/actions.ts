"use server";

import prisma from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";

export type ITrainerDetailForManager = Prisma.PromiseReturnType<
  typeof getTrainerDetailForManager
>;

export const getTrainerDetailForManager = async (id: string) => {
  const trainer = await prisma.trainer.findUnique({
    where: {
      id,
    },
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
      ptCoupon: {
        select: {
          id: true,
        },
      },
    },
  });
  return trainer;
};
