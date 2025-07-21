"use server";

import prisma from "@/app/lib/prisma";
import { getSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { convertKSTtoUTC } from "@/app/lib/utils";
import { PtState } from "@prisma/client";

export const getPtList = async () => {
  const today = new Date().setHours(0, 0, 0, 0);
  const utcToday = convertKSTtoUTC(new Date(today));
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const trainerId = session.roleId;

  const ptList = await prisma.pt.findMany({
    where: {
      trainerId,
      state: {
        in: [PtState.CONFIRMED, PtState.FINISHED],
      },
    },
    select: {
      id: true,
      state: true,
      member: {
        select: {
          user: {
            select: {
              username: true,
              id: true,
            },
          },
        },
      },
      ptRecord: {
        where: {
          ptSchedule: {
            date: {
              gte: utcToday,
            },
          },
        },
        orderBy: {
          ptSchedule: {
            date: "asc",
          },
        },
        select: {
          id: true,
          ptSchedule: {
            select: {
              date: true,
              startTime: true,
              endTime: true,
            },
          },
          pt: {
            select: {
              ptProduct: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      },
      _count: {
        select: {
          ptRecord: true,
        },
      },
    },
  });

  const result = ptList
    .filter((pt) => pt.ptRecord.length > 0) // 예정된 수업이 있는 것만 필터링
    .map((pt) => ({
      ptId: pt.id,
      ptState: pt.state,
      ptTitle: pt.ptRecord[0].pt.ptProduct.title,
      memberId: pt.member?.user.id,
      memberName: pt.member?.user.username,
      date: pt.ptRecord[0].ptSchedule.date,
      startTime: pt.ptRecord[0].ptSchedule.startTime,
      endTime: pt.ptRecord[0].ptSchedule.endTime,
      order: pt._count.ptRecord - pt.ptRecord.length + 1,
    }))
    .sort((a, b) => {
      // 1. state로 먼저 정렬 (CONFIRMED가 FINISHED보다 우선)
      if (a.ptState !== b.ptState) {
        if (a.ptState === PtState.CONFIRMED) return -1;
        if (b.ptState === PtState.CONFIRMED) return 1;
        return 0;
      }
      // 2. state가 같으면 날짜로 정렬
      return a.date.getTime() - b.date.getTime();
    });

  return result;
};
