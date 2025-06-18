"use server";

import prisma from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";

export type ICenterDetail = Prisma.PromiseReturnType<typeof getCenterDetail>;

export const getCenterDetail = async (centerId: string) => {
  const center = await prisma.fitnessCenter.findUnique({
    where: {
      id: centerId,
    },
    select: {
      id: true,
      title: true,
      address: true,
      phone: true,
      description: true,
      trainers: {
        select: {
          id: true,
          user: {
            select: {
              username: true,
              avatar: true,
            },
          },
        },
      },
      openingHours: {
        select: {
          id: true,
          dayOfWeek: true,
          openTime: true,
          closeTime: true,
        },
      },
      members: {
        select: {
          id: true,
          user: {
            select: {
              username: true,
              avatar: true,
            },
          },
        },
      },
      _count: {
        select: {
          members: true,
          trainers: true,
        },
      },
    },
  });
  return center;
};
