// app/lib/supabase-chat.ts
import { supabase } from "@/app/lib/supabase";
import type { IMessageData } from "@/app/lib/services/chat.service";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Supabase Realtime 메시지 타입
interface ISupabaseMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  messageType: string;
  createdAt: string;
}

// 구독 반환 타입
interface ISubscription {
  unsubscribe: () => void;
}

// 채널 상태 관리를 위한 Map
const activeChannels = new Map<string, RealtimeChannel>();

// 실시간 메시지 구독
export function subscribeToMessages(
  roomId: string,
  onMessage: (message: IMessageData) => void
): ISubscription {
  // 기존 채널이 있으면 제거
  const existingChannel = activeChannels.get(`room-${roomId}`);
  if (existingChannel) {
    try {
      supabase.removeChannel(existingChannel);
      activeChannels.delete(`room-${roomId}`);
    } catch (error) {
      console.warn("Failed to remove existing channel:", error);
    }
  }

  const channel = supabase
    .channel(`room-${roomId}`, {
      config: {
        presence: {
          key: `user-${Date.now()}`, // 고유한 키 생성
        },
      },
    })
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
          // 기본 메시지 형태로 폴백 (타입 안전하게)
          onMessage({
            id: newMessage.id,
            content: newMessage.content,
            createdAt: new Date(newMessage.createdAt), // string을 Date로 변환
            senderId: newMessage.senderId,
            messageType: newMessage.messageType as "TEXT" | "IMAGE" | "SYSTEM",
            isRead: false,
            sender: null,
          });
        }
      }
    )
    .subscribe((status, err) => {
      if (err) {
        console.error("Subscription error:", err);
      } else {
        console.log("Subscription status:", status);
      }
    });

  // 채널을 Map에 저장
  activeChannels.set(`room-${roomId}`, channel);

  return {
    unsubscribe: () => {
      try {
        if (activeChannels.has(`room-${roomId}`)) {
          const channelToRemove = activeChannels.get(`room-${roomId}`);
          if (channelToRemove) {
            supabase.removeChannel(channelToRemove);
            activeChannels.delete(`room-${roomId}`);
          }
        }
      } catch (error) {
        console.warn("Error during unsubscribe:", error);
      }
    },
  };
}

// 읽음 상태 변경 콜백 타입
type ReadStatusChangeCallback = (
  messageId: string,
  readBy: Array<{ userId: string; readAt: string }>
) => void;

// 실시간 읽음 상태 구독
export function subscribeToReadStatus(
  roomId: string,
  onReadStatusChange: ReadStatusChangeCallback
): ISubscription {
  // 기존 읽음 상태 채널 제거
  const existingChannel = activeChannels.get(`read-${roomId}`);
  if (existingChannel) {
    try {
      supabase.removeChannel(existingChannel);
      activeChannels.delete(`read-${roomId}`);
    } catch (error) {
      console.warn("Failed to remove existing read status channel:", error);
    }
  }

  const channel = supabase
    .channel(`read-${roomId}`, {
      config: {
        presence: {
          key: `read-user-${Date.now()}`,
        },
      },
    })
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
    .subscribe((status, err) => {
      if (err) {
        console.error("Read status subscription error:", err);
      }
    });

  activeChannels.set(`read-${roomId}`, channel);

  return {
    unsubscribe: () => {
      try {
        if (activeChannels.has(`read-${roomId}`)) {
          const channelToRemove = activeChannels.get(`read-${roomId}`);
          if (channelToRemove) {
            supabase.removeChannel(channelToRemove);
            activeChannels.delete(`read-${roomId}`);
          }
        }
      } catch (error) {
        console.warn("Error during read status unsubscribe:", error);
      }
    },
  };
}

// 온라인 사용자 타입
interface IOnlineUser {
  userId: string;
  isOnline: boolean;
}

// 온라인 상태 변경 콜백 타입
type PresenceChangeCallback = (users: IOnlineUser[]) => void;

// 채팅방 참여자 온라인 상태 구독 (선택사항)
export function subscribeToPresence(
  roomId: string,
  userId: string,
  onPresenceChange: PresenceChangeCallback
): ISubscription {
  // 기존 presence 채널 제거
  const existingChannel = activeChannels.get(`presence-${roomId}`);
  if (existingChannel) {
    try {
      supabase.removeChannel(existingChannel);
      activeChannels.delete(`presence-${roomId}`);
    } catch (error) {
      console.warn("Failed to remove existing presence channel:", error);
    }
  }

  const channel = supabase
    .channel(`presence-${roomId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    })
    .on("presence", { event: "sync" }, () => {
      const presenceState = channel.presenceState();
      const users: IOnlineUser[] = Object.keys(presenceState).map((userId) => ({
        userId,
        isOnline: true,
      }));
      onPresenceChange(users);
    })
    .on("presence", { event: "join" }, ({ key, newPresences }) => {
      console.log("User joined:", key, newPresences);
    })
    .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
      console.log("User left:", key, leftPresences);
    })
    .subscribe(async (status, err) => {
      if (err) {
        console.error("Presence subscription error:", err);
      } else if (status === "SUBSCRIBED") {
        try {
          // 현재 사용자의 존재감을 전송
          await channel.track({
            userId,
            joinedAt: new Date().toISOString(),
          });
        } catch (error) {
          console.warn("Error tracking presence:", error);
        }
      }
    });

  activeChannels.set(`presence-${roomId}`, channel);

  return {
    unsubscribe: () => {
      try {
        if (activeChannels.has(`presence-${roomId}`)) {
          const channelToRemove = activeChannels.get(`presence-${roomId}`);
          if (channelToRemove) {
            supabase.removeChannel(channelToRemove);
            activeChannels.delete(`presence-${roomId}`);
          }
        }
      } catch (error) {
        console.warn("Error during presence unsubscribe:", error);
      }
    },
  };
}

// 모든 채널 정리 (앱 종료 시 사용)
export function cleanupAllChannels(): void {
  activeChannels.forEach((channel, channelId) => {
    try {
      supabase.removeChannel(channel);
    } catch (error) {
      console.warn(`Error removing channel ${channelId}:`, error);
    }
  });
  activeChannels.clear();
}
