"use server";
import prisma from "@/app/lib/prisma";
import { redirect } from "next/navigation";

export async function getChatRoomPtInfo(roomId: string, userId: string) {
  const chatRoom = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      participants: {
        select: {
          user: {
            select: {
              id: true,
              role: true,
              memberProfile: { select: { id: true } },
              trainerProfile: { select: { id: true } },
            },
          },
        },
      },
    },
  });
  if (
    !chatRoom || // 채팅방 정보가 없음
    !chatRoom.participants || // 참여자 정보가 없음
    chatRoom.participants.length === 0 || // 참여자 0명
    chatRoom.participants.find((p) => p.user.id === userId) === undefined // 현재 유저가 참여자가 아님
  ) {
    redirect("/trainer/chat");
  }

  let ptInfo = null;

  if (chatRoom.participants.length === 2) {
    // 1:1 대화, MEMBER 1명, TRAINER 1명인지 체크
    const member = chatRoom.participants.find((p) => p.user.role === "MEMBER");
    const trainer = chatRoom.participants.find(
      (p) => p.user.role === "TRAINER"
    );
    if (member?.user.memberProfile?.id && trainer?.user.trainerProfile?.id) {
      // PT 모델에서 해당 memberId, trainerId로 PT 찾기
      const pt = await prisma.pt.findFirst({
        where: {
          memberId: member.user.memberProfile.id,
          trainerId: trainer.user.trainerProfile.id,
        },
        select: {
          id: true,
          isActive: true,
          startDate: true,
          ptProduct: { select: { title: true } },
        },
      });
      if (pt) {
        ptInfo = {
          id: pt.id,
          title: pt.ptProduct.title,
          state: pt.isActive
            ? "수업중"
            : pt.startDate > new Date()
            ? "대기중"
            : "종료",
        };
      }
    }
  }
  return ptInfo;
}
