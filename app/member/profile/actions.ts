"use server";

import prisma from "@/app/lib/prisma";
import { getSessionOrRedirect } from "@/app/lib/session";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

export type IMemberProfile = Prisma.PromiseReturnType<typeof getProfile>;

export const getProfile = async () => {
  const session = await getSessionOrRedirect();
  const profile = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      username: true,
      email: true,
      avatar: true,
      memberProfile: {
        select: {
          membership: {
            where: {
              isActive: true,
            },
            select: {
              id: true,
              isActive: true,
              membershipProduct: {
                select: {
                  totalCount: true,
                  title: true,
                },
              },
              paid: true,
              startedAt: true,
              membershipPayment: { select: { paidAt: true } },
            },
          },
          pt: {
            where: {
              OR: [
                { isActive: true },
                {
                  isActive: false,
                  startDate: { gt: new Date() }, // startDate가 미래
                },
              ],
            },
            select: {
              id: true,
              startDate: true,
              isActive: true,
              trainer: { select: { user: { select: { username: true } } } },
              ptProduct: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!profile) {
    return redirect("/login");
  } else {
    return profile;
  }
};
