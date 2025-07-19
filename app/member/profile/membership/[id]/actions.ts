"use server";

import prisma from "@/app/lib/prisma";
import { getSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

export type IMyMembership = NonNullable<
  Prisma.PromiseReturnType<typeof getMyMembership>["membership"]
>;

export const getMyMembership = async ({
  membershipId,
}: {
  membershipId: string;
}) => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const membership = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      member: { userId: session.id },
    },
    select: {
      id: true,
      isActive: true,
      startedAt: true,
      totalDays: true,
      paid: true,
      membershipCoupon: {
        select: {
          trainer: { select: { user: { select: { username: true } } } },
        },
      },
      membershipProduct: {
        select: {
          title: true,
          description: true,
        },
      },
      membershipPayment: {
        select: {
          paidAt: true,
          price: true,
        },
      },
    },
  });
  if (!membership) {
    return { ok: false };
  } else {
    return { ok: true, membership };
  }
};
