"use server";

import prisma from "@/app/lib/prisma";
import { getSessionOrRedirect } from "../lib/session";
import { convertKSTtoUTC } from "../lib/utils";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

export type ITrainerInfo = Prisma.PromiseReturnType<typeof welcomeTrainer>;

// welcome trainer
export const welcomeTrainer = async () => {
  const session = await getSessionOrRedirect();
  if (session.role !== "TRAINER") redirect("/");
  const roleId = session.roleId;

  const today = new Date();

  const oneWeekLater = new Date(today.setDate(today.getDate() + 7));
  // 이번주 토요일까지 계산
  const thisWeekEnd = new Date(today); // 오늘 날짜 복사
  // 이번 주 토요일 계산 (요일은 0: 일요일 ~ 6: 토요일)
  const dayOfWeek = today.getDay(); // 오늘의 요일 (0 ~ 6)
  const daysUntilSaturday = 6 - dayOfWeek; // 토요일까지 남은 일수
  thisWeekEnd.setDate(today.getDate() + daysUntilSaturday); // 이번 주 토요일로 설정
  const trainerInfo = await prisma.trainer.findUnique({
    where: {
      id: roleId,
    },
    select: {
      user: {
        select: {
          username: true,
        },
      },
      fitnessCenter: {
        select: {
          title: true,
        },
      },
      pt: {
        where: {
          trainerConfirmed: true,
        },
        select: {
          member: {
            select: {
              user: {
                select: {
                  username: true,
                },
              },
            },
          },
          isActive: true,
          trainerConfirmed: true,
          id: true,
          ptRecord: {
            where: {
              ptSchedule: {
                AND: [
                  {
                    date: {
                      gte: convertKSTtoUTC(new Date()),
                      lt: convertKSTtoUTC(thisWeekEnd), // one Week Later
                    },
                  },
                ],
              },
            },
            select: {
              id: true,
              ptSchedule: {
                select: {
                  date: true,
                  startTime: true,
                },
              },
            },
          },
        },
      },
      _count: { select: { pt: true } },
    },
  });
  return trainerInfo;
};

export const getTodayPtRecords = async () => {
  const session = await getSessionOrRedirect();
  if (session.role !== "TRAINER") redirect("/");
  const roleId = session.roleId;

  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const ptRecords = await prisma.ptRecord.findMany({
    where: {
      pt: {
        trainerId: roleId,
      },
      ptSchedule: {
        date: {
          gte: convertKSTtoUTC(startOfDay),
          lte: convertKSTtoUTC(endOfDay),
        },
      },
    },
    select: {
      id: true,
      attended: true,
      ptSchedule: {
        select: {
          date: true,
          startTime: true,
          endTime: true,
        },
      },
      pt: {
        select: {
          id: true,
          member: {
            select: {
              user: {
                select: {
                  username: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      ptSchedule: {
        startTime: "asc",
      },
    },
  });

  return ptRecords;
};

export const getPendingPtCount = async () => {
  const session = await getSessionOrRedirect();
  if (session.role !== "TRAINER") redirect("/");
  const roleId = session.roleId;

  const count = await prisma.pt.count({
    where: {
      trainerId: roleId,
      trainerConfirmed: false,
    },
  });

  return count;
};

export const getUnreadChatCount = async () => {
  const session = await getSessionOrRedirect();
  if (session.role !== "TRAINER") redirect("/");
  const roleId = session.roleId;

  const unreadCount = await prisma.messageReadStatus.count({
    where: {
      message: {
        room: {
          participants: {
            some: {
              userId: session.id,
            },
          },
        },
        NOT: {
          senderId: session.id,
        },
      },
      userId: session.id,
      readAt: null,
    },
  });

  return unreadCount;
};
