"use server";

import prisma from "@/app/lib/prisma";
import { getSessionOrRedirect } from "@/app/lib/session";
import { Prisma } from "@prisma/client";

export type IMyMemberships = Prisma.PromiseReturnType<typeof getMyMemberships>;

export const getMyMemberships = async () => {
  // get all user's membership
  const session = await getSessionOrRedirect();
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
