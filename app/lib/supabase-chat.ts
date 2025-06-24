// app/lib/supabase-chat.ts
import { supabase } from "@/app/lib/supabase";
import type { IMessageData } from "@/app/lib/services/chat.service";

// Supabase Realtime 메시지 타입
interface ISupabaseMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  messageType: string;
  createdAt: string;
}

// 실시간 메시지 구독
export function subscribeToMessages(
  roomId: string,
  onMessage: (message: IMessageData) => void
) {
  const channel = supabase
    .channel(`room-${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "Message",
        filter: `roomId=eq.${roomId}`,
      },
      async (payload) => {
        const newMessage = payload.new as ISupabaseMessage;

        // 새 메시지를 완전한 형태로 변환
        try {
          const response = await fetch(`/api/chat/${roomId}/messages?limit=1`);
          const result = await response.json();

          if (result.success && result.data.length > 0) {
            const latestMessage = result.data[result.data.length - 1];
            if (latestMessage.id === newMessage.id) {
              onMessage(latestMessage);
            }
          }
        } catch (error) {
          console.error("Error fetching latest message:", error);
          // 기본 메시지 형태로 폴백
          onMessage({
            id: newMessage.id,
            content: newMessage.content,
            createdAt: newMessage.createdAt,
            senderId: newMessage.senderId,
            messageType: newMessage.messageType as "TEXT" | "IMAGE" | "SYSTEM",
            sender: null,
            readBy: [],
          });
        }
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

// 실시간 읽음 상태 구독
export function subscribeToReadStatus(
  roomId: string,
  onReadStatusChange: (
    messageId: string,
    readBy: Array<{ userId: string; readAt: string }>
  ) => void
) {
  const channel = supabase
    .channel(`read-${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "MessageRead",
      },
      async (payload) => {
        const readData = payload.new as {
          messageId: string;
          userId: string;
          readAt: string;
        };

        // 해당 메시지의 모든 읽음 상태 조회
        try {
          const response = await fetch(
            `/api/chat/message/${readData.messageId}/read-status`
          );
          const result = await response.json();

          if (result.success) {
            onReadStatusChange(readData.messageId, result.data);
          }
        } catch (error) {
          console.error("Error fetching read status:", error);
        }
      }
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

// 채팅방 참여자 온라인 상태 구독 (선택사항)
export function subscribeToPresence(
  roomId: string,
  userId: string,
  onPresenceChange: (
    users: Array<{ userId: string; isOnline: boolean }>
  ) => void
) {
  const channel = supabase
    .channel(`presence-${roomId}`)
    .on("presence", { event: "sync" }, () => {
      const presenceState = channel.presenceState();
      const users = Object.keys(presenceState).map((userId) => ({
        userId,
        isOnline: true,
      }));
      onPresenceChange(users);
    })
    .on("presence", { event: "join" }, ({ key, newPresences }) => {
      // 사용자가 온라인 상태가 됨
      console.log("User joined:", key, newPresences);
    })
    .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
      // 사용자가 오프라인 상태가 됨
      console.log("User left:", key, leftPresences);
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        // 현재 사용자의 존재감을 전송
        await channel.track({
          userId,
          joinedAt: new Date().toISOString(),
        });
      }
    });

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
