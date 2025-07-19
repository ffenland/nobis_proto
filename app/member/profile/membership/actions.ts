"use server";

import prisma from "@/app/lib/prisma";
import { getSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

export type IMyMemberships = Prisma.PromiseReturnType<typeof getMyMemberships>;

export const getMyMemberships = async () => {
  // get all user's membership
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const memberships = await prisma.membership.findMany({
    where: {
      member: { userId: session.id },
    },
    select: {
      id: true,
      paid: true,
      startedAt: true,

      isActive: true,
      membershipProduct: {
        select: {
          title: true,
        },
      },
    },
  });
  return memberships;
};
