// app/lib/services/chat-simple.service.ts
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

  // 사용자의 채팅방 목록 조회 (간단한 버전)
  async getChatRooms(userId: string) {
    const chatRooms = await prisma.chatRoom.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      orderBy: { lastMessageAt: "desc" },
      select: {
        id: true,
        lastMessageAt: true,
        participants: {
          select: {
            userId: true,
            user: {
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

    // 각 채팅방의 안읽은 메시지 수 계산 (훨씬 간단!)
    const roomsWithUnreadCount = await Promise.all(
      chatRooms.map(async (room) => {
        const otherParticipant = room.participants.find(
          (p) => p.userId !== userId
        );
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
          otherUser: otherParticipant
            ? {
                id: otherParticipant.user.id,
                username: otherParticipant.user.username,
                role: otherParticipant.user.role,
                avatar:
                  otherParticipant.user.avatarMedia?.thumbnailUrl ||
                  otherParticipant.user.avatarMedia?.publicUrl,
              }
            : null,
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

    // 채팅방 참여자 확인
    const isParticipant = await prisma.chatRoomParticipant.findFirst({
      where: { chatRoomId: roomId, userId },
      select: { id: true },
    });

    if (!isParticipant) {
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

    // 채팅방 참여자 확인
    const participant = await prisma.chatRoomParticipant.findFirst({
      where: { chatRoomId: roomId, userId },
      select: { id: true },
    });

    if (!participant) {
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

    // 채팅방 참여자 확인
    const participant = await prisma.chatRoomParticipant.findFirst({
      where: { chatRoomId: roomId, userId },
      select: { id: true },
    });

    if (!participant) {
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

  // 사용자의 총 안읽은 메시지 수 (간단한 쿼리!)
  async getTotalUnreadCount(userId: string) {
    const unreadCount = await prisma.message.count({
      where: {
        senderId: { not: userId }, // 내가 보낸 게 아닌
        isRead: false, // 읽지 않은
        room: {
          participants: { some: { userId } }, // 내가 참여한 채팅방의
        },
      },
    });

    return { unreadCount };
  }

  // 나머지 메서드들 (getOrCreateChatRoom, getChatRoomInfo)은 동일...
  async getOrCreateChatRoom(userId: string, otherUserId: string) {
    // 기존과 동일한 로직
    const existingRoom = await prisma.chatRoom.findFirst({
      where: {
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: otherUserId } } },
          {
            participants: { every: { userId: { in: [userId, otherUserId] } } },
          },
        ],
      },
      select: { id: true },
    });

    if (existingRoom) {
      return { roomId: existingRoom.id, created: false };
    }

    const newRoom = await prisma.chatRoom.create({
      data: {
        participants: {
          create: [{ userId }, { userId: otherUserId }],
        },
      },
      select: { id: true },
    });

    return { roomId: newRoom.id, created: true };
  }

  async getChatRoomInfo(userId: string, roomId: string) {
    // 기존과 거의 동일한 로직 (MessageRead 관련 부분만 제거)
    const chatRoom = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        participants: {
          select: {
            user: {
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
        },
      },
    });

    if (!chatRoom) {
      throw new Error("채팅방을 찾을 수 없습니다.");
    }

    const isParticipant = chatRoom.participants.some(
      (p) => p.user.id === userId
    );
    if (!isParticipant) {
      throw new Error("채팅방에 참여하지 않은 사용자입니다.");
    }

    // PT 정보 조회 (최신 스키마 기준)
    let ptInfo = null;
    if (chatRoom.participants.length === 2) {
      const member = chatRoom.participants.find(
        (p) => p.user.role === "MEMBER"
      );
      const trainer = chatRoom.participants.find(
        (p) => p.user.role === "TRAINER"
      );

      if (member?.user.memberProfile?.id && trainer?.user.trainerProfile?.id) {
        const pt = await prisma.pt.findFirst({
          where: {
            memberId: member.user.memberProfile.id,
            trainerId: trainer.user.trainerProfile.id,
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
    }

    const otherParticipant = chatRoom.participants.find(
      (p) => p.user.id !== userId
    );

    return {
      id: chatRoom.id,
      otherUser: otherParticipant
        ? {
            id: otherParticipant.user.id,
            username: otherParticipant.user.username,
            role: otherParticipant.user.role,
            avatar:
              otherParticipant.user.avatarMedia?.thumbnailUrl ||
              otherParticipant.user.avatarMedia?.publicUrl,
          }
        : null,
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
