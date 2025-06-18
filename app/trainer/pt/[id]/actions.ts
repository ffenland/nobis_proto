"use server";

import prisma from "@/app/lib/prisma";
import { getSessionOrRedirect } from "@/app/lib/session";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

export type IPtDetail = Prisma.PromiseReturnType<typeof getPtDetail>;
export const getPtDetail = async (id: string) => {
  const pt = await prisma.pt.findUnique({
    where: {
      id,
    },
    select: {
      trainerConfirmed: true,
      member: {
        select: {
          user: {
            select: {
              username: true,
              avatar: true,
              createdAt: true,
            },
          },
        },
      },
      isRegular: true,
      startDate: true,
      weekTimes: {
        select: {
          weekDay: true,
          startTime: true,
          endTime: true,
        },
      },
      ptProduct: {
        select: {
          title: true,
          price: true,
          description: true,
          time: true,
          totalCount: true,
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
      },
    },
  });
  return pt;
};

export const submitPendingPt = async (data: FormData) => {
  try {
    const ptId = data.get("ptId") as string;
    console.log("ptId", ptId);
    if (!ptId) {
    } else {
      // TODO: ptId로 pt를 찾고, trainerConfirmed를 true로 바꿔야함
      await prisma.pt.update({
        where: {
          id: ptId,
        },
        data: {
          trainerConfirmed: true,
        },
      });
      return redirect(`/trainer/pt/${ptId}`);
    }
  } catch (error) {
    return redirect("/trainer/pt/");
  }
};

export const goToChatWithMember = async (data: FormData) => {
  const session = await getSessionOrRedirect();
  const userId = session.id;
  const ptId = data.get("ptId") as string;
  const pt = await prisma.pt.findUnique({
    where: {
      id: ptId,
    },
    select: {
      member: {
        select: {
          user: {
            select: {
              id: true,
            },
          },
        },
      },
      trainer: {
        select: {
          user: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });
  if (!pt || !pt.member || !pt.trainer || pt.trainer?.user.id !== userId) {
    return redirect("/trainer/pt/");
  }
  const chatRooms = await prisma.chatRoom.findMany({
    where: {
      participants: {
        every: {
          userId: {
            in: [pt.member.user.id, pt.trainer.user.id],
          },
        },
      },
    },

    select: {
      id: true,
      participants: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
  });

  const memberUserId = pt.member!.user.id;
  const trainerUserId = pt.trainer!.user.id;

  const chatRoom = chatRooms.find((room) => {
    const userIds = room.participants.map((p) => p.userId);
    return (
      userIds.length === 2 &&
      userIds.includes(memberUserId) &&
      userIds.includes(trainerUserId)
    );
  });

  if (!chatRoom) {
    const newChatRoom = await prisma.chatRoom.create({
      data: {
        participants: {
          create: [
            {
              userId: pt.member.user.id,
            },
            {
              userId: pt.trainer.user.id,
            },
          ],
        },
      },
    });
    return redirect(`/trainer/chat/${newChatRoom.id}`);
  }
  return redirect(`/trainer/chat/${chatRoom.id}`);
};
