"use server";

import prisma from "@/app/lib/prisma";
import { getSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { convertKSTtoUTC } from "@/app/lib/utils";

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
    },
    select: {
      id: true,
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
      ptTitle: pt.ptRecord[0].pt.ptProduct.title,
      memberId: pt.member?.user.id,
      memberName: pt.member?.user.username,
      date: pt.ptRecord[0].ptSchedule.date,
      startTime: pt.ptRecord[0].ptSchedule.startTime,
      endTime: pt.ptRecord[0].ptSchedule.endTime,
      order: pt._count.ptRecord - pt.ptRecord.length + 1,
    }));

  return result;
};
