"use server";

import prisma from "@/app/lib/prisma";
import { getSessionOrRedirect } from "@/app/lib/session";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

export type IPtDetailForMember = Prisma.PromiseReturnType<
  typeof getPtDetailForMember
>;
export const getPtDetailForMember = async (ptId: string) => {
  const session = await getSessionOrRedirect();
  if (!session || session.role !== "MEMBER" || !session.roleId) {
    redirect("/login");
  }
  const userId = session.id;
  const pt = await prisma.pt.findUnique({
    where: {
      id: ptId,
    },
    select: {
      id: true,
      ptProduct: {
        select: {
          title: true,
          description: true,
          time: true,
          price: true,
          totalCount: true,
        },
      },
      isRegular: true,
      weekTimes: {
        select: {
          weekDay: true,
          startTime: true,
          endTime: true,
        },
      },
      trainerConfirmed: true,
      isActive: true,
      startDate: true,
      trainer: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      },
      ptRecord: {
        select: {
          id: true,
          ptSchedule: {
            select: {
              date: true,
              startTime: true,
              endTime: true,
            },
          },
          attended: true,
        },
      },
    },
  });
  if (!pt) {
    redirect("/pt");
  }
  if (pt.trainer === null) {
    redirect("/pt");
  }
  return { pt, userId };
};
