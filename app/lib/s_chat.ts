"use server";
import prisma from "@/app/lib/prisma";

// 두 유저가 모두 참여하는 채팅방 찾기 또는 생성
export async function getOrCreateChatRoom(userAId: string, userBId: string) {
  try {
    // 1. 두 유저가 모두 참여자인 채팅방 찾기
    const existingRoom = await prisma.chatRoom.findFirst({
      where: {
        participants: {
          some: { userId: userAId },
          // AND 조건으로 두 명 모두 포함
          every: { userId: { in: [userAId, userBId] } },
        },
      },
      include: { participants: true },
    });

    if (existingRoom) {
      return { ok: true, data: { roomId: existingRoom.id } };
    }

    // 2. 없으면 새로 생성
    const newRoom = await prisma.chatRoom.create({
      data: {
        participants: {
          create: [
            { user: { connect: { id: userAId } } },
            { user: { connect: { id: userBId } } },
          ],
        },
      },
    });

    return { ok: true, data: { roomId: newRoom.id } };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "채팅방 생성 실패" };
  }
}
