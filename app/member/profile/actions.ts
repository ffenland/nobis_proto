"use server";

import prisma from "@/app/lib/prisma";
import { getSessionOrRedirect } from "@/app/lib/session";
import { redirect } from "next/navigation";

export const getProfile = async () => {
  const session = await getSessionOrRedirect();
  const profile = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      username: true,
      email: true,
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
              isActive: true,
            },
            select: {
              id: true,
              startedAt: true,
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
