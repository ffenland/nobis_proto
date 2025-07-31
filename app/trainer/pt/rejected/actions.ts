// app/trainer/pt/rejected/actions.ts
"use server";

import prisma from "@/app/lib/prisma";
import { getSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { PtState } from "@prisma/client";

export const getRejectedPtsAction = async () => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TRAINER") {
    throw new Error("접근 권한이 없습니다.");
  }

  const rejectedPts = await prisma.pt.findMany({
    where: {
      trainerId: session.roleId,
      state: PtState.REJECTED,
    },
    select: {
      id: true,
      createdAt: true,
      startDate: true,
      description: true,
      member: {
        select: {
          user: {
            select: {
              username: true,
              avatarImage: {
                select: {
                  cloudflareId: true,
                },
              },
            },
          },
        },
      },
      ptProduct: {
        select: {
          title: true,
          price: true,
          totalCount: true,
          time: true,
        },
      },
      rejectInfo: {
        select: {
          id: true,
          createdAt: true,
          reason: true,
          schedule: true,
        },
      },
    },
    orderBy: {
      rejectInfo: {
        createdAt: "desc",
      },
    },
  });

  return rejectedPts.filter(pt => pt.member !== null && pt.rejectInfo !== null); // member와 rejectInfo가 null인 경우 제외
};

// 타입 추론을 위한 타입 유틸리티
export type TRejectedPt = Awaited<ReturnType<typeof getRejectedPtsAction>>[number];