"use server";

import prisma from "@/app/lib/prisma";
import { getSessionOrRedirect } from "@/app/lib/session";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

export type IPtList = Prisma.PromiseReturnType<typeof getPtList>;

export const getPtList = async () => {
  const session = await getSessionOrRedirect();
  if (session.role !== "MEMBER") redirect("/");
  // session ok, user is member

  const ptList = await prisma.pt.findMany({
    where: {
      memberId: session.roleId,
    },
    select: {
      id: true,
      ptProduct: {
        select: {
          title: true,
          time: true,
          price: true,
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
          user: {
            select: {
              username: true,
            },
          },
        },
      },
    },
  });
  return ptList;
};
