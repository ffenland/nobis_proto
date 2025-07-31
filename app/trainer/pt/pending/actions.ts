// app/trainer/pt/pending/actions.ts
"use server";

import prisma from "@/app/lib/prisma";
import { getSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { PtState } from "@prisma/client";

export const getPendingPtsAction = async () => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "TRAINER") {
    throw new Error("접근 권한이 없습니다.");
  }

  const pendingPts = await prisma.pt.findMany({
    where: {
      trainerId: session.roleId,
      state: PtState.PENDING,
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
          description: true,
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
        },
        orderBy: {
          ptSchedule: {
            date: "asc",
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return pendingPts.filter(pt => pt.member !== null); // member가 null인 경우 제외
};

// 타입 추론을 위한 타입 유틸리티
export type TPendingPt = Awaited<ReturnType<typeof getPendingPtsAction>>[number];