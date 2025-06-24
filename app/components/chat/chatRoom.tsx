"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { subscribeToMessages } from "@/app/lib/supabase-chat";
import type {
  IMessageData,
  IChatRoomInfoData,
} from "@/app/lib/services/chat.service";

interface IChatRoomProps {
  roomId: string;
  userId: string;
}

// API 요청 함수들
const fetchMessages = async (
  url: string
): Promise<{ success: boolean; data: IMessageData[] }> => {
  const response = await fetch(url);
  return response.json();
};

const fetchRoomInfo = async (
  url: string
): Promise<{ success: boolean; data: IChatRoomInfoData }> => {
  const response = await fetch(url);
  return response.json();
};

const sendMessage = async (
  roomId: string,
  content: string
): Promise<{ success: boolean; data: IMessageData }> => {
  const response = await fetch(`/api/chat/${roomId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  return response.json();
};

const markAsRead = async (roomId: string): Promise<{ success: boolean }> => {
  const response = await fetch(`/api/chat/${roomId}/read`, {
    method: "POST",
  });
  return response.json();
};

export function ChatRoom({ roomId, userId }: IChatRoomProps) {
  const [messages, setMessages] = useState<IMessageData[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // 채팅방 정보 조회
  const { data: roomInfoResult } = useSWR(
    `/api/chat/${roomId}/info`,
    fetchRoomInfo
  );

  // 메시지 조회
  const { data: messagesResult, mutate: mutateMessages } = useSWR(
    `/api/chat/${roomId}/messages?limit=50`,
    fetchMessages
  );

  const roomInfo = roomInfoResult?.success ? roomInfoResult.data : null;

  // 메시지 초기 로드
  useEffect(() => {
    if (messagesResult?.success) {
      setMessages(messagesResult.data);
      // 처음 로드 시 맨 아래로 스크롤
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messagesResult]);

  // 실시간 메시지 구독
  useEffect(() => {
    const subscription = subscribeToMessages(roomId, (newMessage) => {
      setMessages((prev) => {
        // 중복 메시지 방지
        if (prev.some((msg) => msg.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage];
      });

      // 새 메시지가 오면 스크롤을 맨 아래로
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [roomId]);

  // 읽음 처리 (채팅방 입장 시, 새 메시지 도착 시)
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        markAsRead(roomId).catch(console.error);

        // 로컬 상태에서 내가 받은 메시지들을 읽음 처리
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.senderId !== userId && !msg.isRead) {
              return { ...msg, isRead: true };
            }
            return msg;
          })
        );
      }, 1000); // 1초 후 읽음 처리

      return () => clearTimeout(timer);
    }
  }, [roomId, messages.length, userId]);

  // 메시지 전송 핸들러
  const handleSendMessage = useCallback(
    async (content: string) => {
      const result = await sendMessage(roomId, content);
      if (!result.success) {
        throw new Error("메시지 전송에 실패했습니다.");
      }
      // 실시간 구독으로 메시지가 추가되므로 여기서는 별도 처리 불필요
    },
    [roomId]
  );

  // 이전 메시지 로드 (향후 무한 스크롤용)
  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMore || messages.length === 0) return;

    setIsLoadingMore(true);
    try {
      const oldestMessage = messages[0];
      const response = await fetch(
        `/api/chat/${roomId}/messages?cursor=${oldestMessage.id}&limit=50`
      );
      const result = await response.json();

      if (result.success && result.data.length > 0) {
        setMessages((prev) => [...result.data, ...prev]);
      }
    } catch (error) {
      console.error("Error loading more messages:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [roomId, messages, isLoadingMore]);

  if (!roomInfo) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">채팅방 정보를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 채팅방 헤더 */}
      <div className="border-b border-gray-200 p-4 bg-white">
        <div className="flex items-center gap-3">
          {/* 상대방 아바타 */}
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
            {roomInfo.otherUser?.avatar ? (
              <img
                src={roomInfo.otherUser.avatar}
                alt={roomInfo.otherUser.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm text-gray-600">
                {roomInfo.otherUser?.username?.charAt(0).toUpperCase() || "?"}
              </span>
            )}
          </div>

          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">
              {roomInfo.otherUser?.username || "알 수 없음"}
            </h2>

            {/* PT 정보 표시 */}
            {roomInfo.ptInfo && (
              <p className="text-sm text-gray-500">
                {roomInfo.ptInfo.title} • {roomInfo.ptInfo.state}
              </p>
            )}

            {/* 역할 표시 */}
            {roomInfo.otherUser && (
              <p className="text-xs text-gray-400">
                {roomInfo.otherUser.role === "TRAINER"
                  ? "트레이너"
                  : roomInfo.otherUser.role === "MEMBER"
                  ? "회원"
                  : "매니저"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-1"
      >
        {/* 이전 메시지 로드 버튼 (향후 무한 스크롤용) */}
        {messages.length >= 50 && (
          <div className="text-center mb-4">
            <button
              onClick={loadMoreMessages}
              disabled={isLoadingMore}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {isLoadingMore ? "로딩 중..." : "이전 메시지 보기"}
            </button>
          </div>
        )}

        {/* 메시지 목록 */}
        {messages.map((message, index) => {
          const isOwn = message.senderId === userId;
          const showAvatar =
            !isOwn &&
            (index === 0 || messages[index - 1].senderId !== message.senderId);

          return (
            <ChatMessage
              key={message.id}
              message={message}
              isOwn={isOwn}
              showAvatar={showAvatar}
              showReadStatus={true}
            />
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* 메시지 입력 영역 */}
      <ChatInput
        onSendMessage={handleSendMessage}
        placeholder={`${
          roomInfo.otherUser?.username || "상대방"
        }에게 메시지 보내기`}
      />
    </div>
  );
}
