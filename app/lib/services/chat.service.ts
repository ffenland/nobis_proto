// app/lib/services/chat.service.ts
import prisma from "@/app/lib/prisma";

// 입력 타입 정의
export interface ISendMessageRequest {
  roomId: string;
  content: string;
}

export interface ICreateChatRoomRequest {
  otherUserId: string;
}

export interface IMarkAsReadRequest {
  roomId: string;
}

export interface IChatConnectRequest {
  opponentUserId: string;
  opponentRole: "MEMBER" | "TRAINER";
}

export interface IGetMessagesRequest {
  roomId: string;
  cursor?: string;
  limit?: number;
}

export enum MessageType {
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  SYSTEM = "SYSTEM",
}

export class ChatService {
  private static instance: ChatService;

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  // 사용자의 채팅방 목록 조회 (새로운 스키마 방식)
  async getChatRooms(userId: string) {
    const chatRooms = await prisma.chatRoom.findMany({
      where: {
        OR: [{ userOneId: userId }, { userTwoId: userId }],
      },
      orderBy: { lastMessageAt: "desc" },
      select: {
        id: true,
        lastMessageAt: true,
        userOne: {
          select: {
            id: true,
            username: true,
            role: true,
            avatarMedia: {
              select: {
                thumbnailUrl: true,
                publicUrl: true,
              },
            },
          },
        },
        userTwo: {
          select: {
            id: true,
            username: true,
            role: true,
            avatarMedia: {
              select: {
                thumbnailUrl: true,
                publicUrl: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
            messageType: true,
            isRead: true,
          },
        },
      },
    });

    // 각 채팅방의 안읽은 메시지 수 계산
    const roomsWithUnreadCount = await Promise.all(
      chatRooms.map(async (room) => {
        // 상대방 정보 확인
        const otherUser =
          room.userOne.id === userId ? room.userTwo : room.userOne;
        const lastMessage = room.messages[0];

        // 간단한 안읽은 메시지 수 계산
        const unreadCount = await prisma.message.count({
          where: {
            roomId: room.id,
            senderId: { not: userId }, // 내가 보낸 게 아닌
            isRead: false, // 읽지 않은 메시지
          },
        });

        return {
          id: room.id,
          lastMessageAt: room.lastMessageAt,
          otherUser: {
            id: otherUser.id,
            username: otherUser.username,
            role: otherUser.role,
            avatar:
              otherUser.avatarMedia?.thumbnailUrl ||
              otherUser.avatarMedia?.publicUrl,
          },
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                createdAt: lastMessage.createdAt,
                isMine: lastMessage.senderId === userId,
                type: lastMessage.messageType,
                isRead: lastMessage.isRead,
              }
            : null,
          unreadCount,
        };
      })
    );

    return roomsWithUnreadCount;
  }

  // 채팅방 메시지 조회 (간단한 버전)
  async getMessages(userId: string, request: IGetMessagesRequest) {
    const { roomId, cursor, limit = 50 } = request;

    // 채팅방 참여자 확인 (새로운 스키마 방식)
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: {
        userOneId: true,
        userTwoId: true,
      },
    });

    if (
      !chatRoom ||
      (chatRoom.userOneId !== userId && chatRoom.userTwoId !== userId)
    ) {
      throw new Error("채팅방에 참여하지 않은 사용자입니다.");
    }

    const messages = await prisma.message.findMany({
      where: {
        roomId,
        ...(cursor && { id: { lt: cursor } }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        content: true,
        createdAt: true,
        senderId: true,
        messageType: true,
        isRead: true,
        sender: {
          select: {
            username: true,
            role: true,
            avatarMedia: {
              select: {
                thumbnailUrl: true,
                publicUrl: true,
              },
            },
          },
        },
      },
    });

    return messages.reverse(); // 시간 순으로 정렬
  }

  // 메시지 전송 (간단한 버전)
  async sendMessage(userId: string, request: ISendMessageRequest) {
    const { roomId, content } = request;

    // 채팅방 참여자 확인 (새로운 스키마 방식)
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: {
        userOneId: true,
        userTwoId: true,
      },
    });

    if (
      !chatRoom ||
      (chatRoom.userOneId !== userId && chatRoom.userTwoId !== userId)
    ) {
      throw new Error("채팅방에 참여하지 않은 사용자입니다.");
    }

    // 트랜잭션으로 메시지 전송 및 채팅방 업데이트
    const result = await prisma.$transaction(async (tx) => {
      // 메시지 생성 (내가 보낸 메시지는 자동으로 읽음 처리)
      const message = await tx.message.create({
        data: {
          roomId,
          senderId: userId,
          content,
          messageType: MessageType.TEXT,
          isRead: false, // 상대방이 읽어야 하므로 false
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          senderId: true,
          messageType: true,
          isRead: true,
          sender: {
            select: {
              username: true,
              role: true,
              avatarMedia: {
                select: {
                  thumbnailUrl: true,
                  publicUrl: true,
                },
              },
            },
          },
        },
      });

      // 채팅방 lastMessageAt 업데이트
      await tx.chatRoom.update({
        where: { id: roomId },
        data: { lastMessageAt: new Date() },
      });

      return message;
    });

    return result;
  }

  // 메시지 읽음 처리 (훨씬 간단!)
  async markAsRead(userId: string, request: IMarkAsReadRequest) {
    const { roomId } = request;

    // 채팅방 참여자 확인 (새로운 스키마 방식)
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: {
        userOneId: true,
        userTwoId: true,
      },
    });

    if (
      !chatRoom ||
      (chatRoom.userOneId !== userId && chatRoom.userTwoId !== userId)
    ) {
      throw new Error("채팅방에 참여하지 않은 사용자입니다.");
    }

    // 내가 받은 안읽은 메시지들을 모두 읽음 처리
    await prisma.message.updateMany({
      where: {
        roomId,
        senderId: { not: userId }, // 내가 보낸 게 아닌
        isRead: false, // 아직 읽지 않은
      },
      data: {
        isRead: true,
      },
    });

    return { success: true };
  }

  // 사용자의 총 안읽은 메시지 수 (새로운 스키마 방식)
  async getTotalUnreadCount(userId: string) {
    const unreadCount = await prisma.message.count({
      where: {
        senderId: { not: userId }, // 내가 보낸 게 아닌
        isRead: false, // 읽지 않은
        room: {
          OR: [{ userOneId: userId }, { userTwoId: userId }],
        },
      },
    });

    return { unreadCount };
  }

  // 채팅방 연결 (공용 - 멤버, 트레이너 모두 사용 가능)
  async connectToChatRoom(userId: string, request: IChatConnectRequest) {
    const { opponentUserId, opponentRole } = request;

    // 1. 본인 정보 확인
    const currentUser = await prisma.user.findFirst({
      where: {
        id: userId,
      },
      select: {
        id: true,
        role: true,
        username: true,
        memberProfile: {
          select: {
            id: true,
          },
        },
        trainerProfile: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!currentUser) {
      throw new Error("사용자 정보를 찾을 수 없습니다.");
    }

    // 2. 상대방 정보 확인
    const opponent = await prisma.user.findFirst({
      where: {
        id: opponentUserId,
        role: opponentRole,
      },
      select: {
        id: true,
        role: true,
        username: true,
        memberProfile: {
          select: {
            id: true,
          },
        },
        trainerProfile: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!opponent) {
      throw new Error(
        `해당 ${
          opponentRole === "TRAINER" ? "트레이너" : "회원"
        }을 찾을 수 없습니다.`
      );
    }

    // 역할별 프로필 확인
    if (opponentRole === "TRAINER" && !opponent.trainerProfile) {
      throw new Error("트레이너 프로필을 찾을 수 없습니다.");
    }
    if (opponentRole === "MEMBER" && !opponent.memberProfile) {
      throw new Error("회원 프로필을 찾을 수 없습니다.");
    }

    // 3. 기존 채팅방 조회 (새로운 스키마 방식)
    const [userOneId, userTwoId] = [userId, opponentUserId].sort();

    const existingRoom = await prisma.chatRoom.findUnique({
      where: {
        unique_chat_participants: {
          userOneId,
          userTwoId,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingRoom) {
      return {
        roomId: existingRoom.id,
        created: false,
        opponentName: opponent.username,
        // 호환성을 위해 기존 필드 유지
        trainerName: opponentRole === "TRAINER" ? opponent.username : undefined,
        memberName: opponentRole === "MEMBER" ? opponent.username : undefined,
      };
    }

    // 4. 새 채팅방 생성
    const newRoom = await prisma.chatRoom.create({
      data: {
        userOneId,
        userTwoId,
      },
      select: {
        id: true,
      },
    });

    return {
      roomId: newRoom.id,
      created: true,
      opponentName: opponent.username,
      // 호환성을 위해 기존 필드 유지
      trainerName: opponentRole === "TRAINER" ? opponent.username : undefined,
      memberName: opponentRole === "MEMBER" ? opponent.username : undefined,
    };
  }

  async getOrCreateChatRoom(userId: string, otherUserId: string) {
    // 새로운 스키마 방식으로 수정
    const [userOneId, userTwoId] = [userId, otherUserId].sort();

    const existingRoom = await prisma.chatRoom.findUnique({
      where: {
        unique_chat_participants: {
          userOneId,
          userTwoId,
        },
      },
      select: { id: true },
    });

    if (existingRoom) {
      return { roomId: existingRoom.id, created: false };
    }

    const newRoom = await prisma.chatRoom.create({
      data: {
        userOneId,
        userTwoId,
      },
      select: { id: true },
    });

    return { roomId: newRoom.id, created: true };
  }

  async getChatRoomInfo(userId: string, roomId: string) {
    // 새로운 스키마 방식으로 수정
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        userOne: {
          select: {
            id: true,
            username: true,
            role: true,
            memberProfile: { select: { id: true } },
            trainerProfile: { select: { id: true } },
            avatarMedia: {
              select: {
                thumbnailUrl: true,
                publicUrl: true,
              },
            },
          },
        },
        userTwo: {
          select: {
            id: true,
            username: true,
            role: true,
            memberProfile: { select: { id: true } },
            trainerProfile: { select: { id: true } },
            avatarMedia: {
              select: {
                thumbnailUrl: true,
                publicUrl: true,
              },
            },
          },
        },
      },
    });

    if (!chatRoom) {
      throw new Error("채팅방을 찾을 수 없습니다.");
    }

    // 참여자 확인
    const isParticipant =
      chatRoom.userOne.id === userId || chatRoom.userTwo.id === userId;
    if (!isParticipant) {
      throw new Error("채팅방에 참여하지 않은 사용자입니다.");
    }

    // 상대방 정보 확인
    const otherUser =
      chatRoom.userOne.id === userId ? chatRoom.userTwo : chatRoom.userOne;

    // PT 정보 조회
    let ptInfo = null;
    const member =
      chatRoom.userOne.role === "MEMBER"
        ? chatRoom.userOne
        : chatRoom.userTwo.role === "MEMBER"
        ? chatRoom.userTwo
        : null;
    const trainer =
      chatRoom.userOne.role === "TRAINER"
        ? chatRoom.userOne
        : chatRoom.userTwo.role === "TRAINER"
        ? chatRoom.userTwo
        : null;

    if (member?.memberProfile?.id && trainer?.trainerProfile?.id) {
      const pt = await prisma.pt.findFirst({
        where: {
          memberId: member.memberProfile.id,
          trainerId: trainer.trainerProfile.id,
        },
        select: {
          id: true,
          state: true,
          startDate: true,
          ptProduct: {
            select: {
              title: true,
              totalCount: true,
            },
          },
          ptRecord: {
            select: {
              items: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });

      if (pt) {
        // PT 상태 결정 로직
        let state: string;

        if (pt.state === "PENDING") {
          state = "승인대기";
        } else if (pt.state === "REJECTED") {
          state = "거절됨";
        } else {
          state = "승인됨";
        }

        ptInfo = {
          id: pt.id,
          title: pt.ptProduct.title,
          state,
        };
      }
    }

    return {
      id: chatRoom.id,
      otherUser: {
        id: otherUser.id,
        username: otherUser.username,
        role: otherUser.role,
        avatar:
          otherUser.avatarMedia?.thumbnailUrl ||
          otherUser.avatarMedia?.publicUrl,
      },
      ptInfo,
    };
  }
}

// 타입 추출
const chatService = ChatService.getInstance();
export type IChatRoomsData = Awaited<
  ReturnType<typeof chatService.getChatRooms>
>;
export type IChatRoomData = IChatRoomsData[0];
export type IMessagesData = Awaited<ReturnType<typeof chatService.getMessages>>;
export type IMessageData = IMessagesData[0];
export type IChatRoomInfoData = Awaited<
  ReturnType<typeof chatService.getChatRoomInfo>
>;
export type ISendMessageData = Awaited<
  ReturnType<typeof chatService.sendMessage>
>;
