"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";
import type {
  IMessageData,
  IChatRoomInfoData,
} from "@/app/lib/services/chat.service";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Image from "next/image";

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

const sendMessageToAPI = async (
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

// 비활성 시간 설정 (밀리초)
const INACTIVITY_WARNING_TIME = 3 * 60 * 1000; // 3분
const MODAL_TIMEOUT = 2 * 60 * 1000; // 모달 표시 후 2분

export function ChatRoom({ roomId, userId }: IChatRoomProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<IMessageData[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showInactivityModal, setShowInactivityModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const modalTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 채팅방 정보 조회
  const { data: roomInfoResult } = useSWR(
    `/api/chat/${roomId}/info`,
    fetchRoomInfo
  );

  // 메시지 조회
  const { data: messagesResult } = useSWR(
    `/api/chat/${roomId}/messages?limit=50`,
    fetchMessages
  );

  const roomInfo = roomInfoResult?.success ? roomInfoResult.data : null;

  // 세션 종료 처리 - 먼저 정의
  const handleEndSession = useCallback(() => {
    console.log("[ChatRoom] 세션 종료 - 채팅 목록으로 이동");

    // 채널 정리
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // 타이머 정리
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (modalTimerRef.current) {
      clearTimeout(modalTimerRef.current);
      modalTimerRef.current = null;
    }

    // 채팅 목록으로 이동
    router.push("/member/chat");
  }, [router]);

  // 활동 업데이트 함수
  const updateActivity = useCallback(() => {
    // 기존 타이머 취소
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (modalTimerRef.current) {
      clearTimeout(modalTimerRef.current);
      modalTimerRef.current = null;
    }

    // 모달이 표시중이면 숨기기
    if (showInactivityModal) {
      setShowInactivityModal(false);
    }

    // 새 타이머 설정
    inactivityTimerRef.current = setTimeout(() => {
      console.log("[ChatRoom] 3분 동안 비활성 - 모달 표시");
      setShowInactivityModal(true);

      // 모달 표시 후 2분 타이머
      modalTimerRef.current = setTimeout(() => {
        console.log("[ChatRoom] 모달 타임아웃 - 자동 종료");
        handleEndSession();
      }, MODAL_TIMEOUT);
    }, INACTIVITY_WARNING_TIME);
  }, [showInactivityModal, handleEndSession]);

  // 세션 연장 처리
  const handleExtendSession = useCallback(() => {
    console.log("[ChatRoom] 세션 연장");
    setShowInactivityModal(false);
    updateActivity();
  }, [updateActivity]);

  // 메시지 초기 로드
  useEffect(() => {
    if (messagesResult?.success) {
      setMessages(messagesResult.data);
      // 처음 로드 시 맨 아래로 스크롤 (포커스 방해하지 않도록 긴 딜레이)
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, [messagesResult]);

  // Supabase 채널 구독 - Supabase 공식 문서 패턴
  useEffect(() => {
    if (!roomId || !userId) return;

    let mounted = true;

    // 개발 모드 확인 - StrictMode 이슈 회피를 위한 지연
    const isDevelopment = process.env.NODE_ENV === "development";
    const delay = isDevelopment ? 50 : 0; // 개발 모드에서만 50ms 지연

    const timer = setTimeout(() => {
      if (!mounted) return;

      console.log(`[ChatRoom] 채널 구독 시작: ${roomId} (delay: ${delay}ms)`);
      setIsConnecting(true);
      setError(null);

      // 채널 생성 및 구독
      const channel = supabase
        .channel(`room-${roomId}`, {
          config: {
            broadcast: { self: true },
          },
        })
        .on("broadcast", { event: "new-message" }, (payload) => {
          console.log("[ChatRoom] 메시지 수신:", payload);
          updateActivity(); // 메시지 수신 시 활동 업데이트

          if (payload.payload) {
            const newMessage = payload.payload as {
              id: string;
              content: string;
              createdAt: string;
              senderId: string;
              messageType: string;
              sender?: {
                id: string;
                name: string;
                profileImageUrl?: string;
              };
            };

            // 브로드캐스트 메시지를 IMessageData 형식으로 변환
            const messageData: IMessageData = {
              id: newMessage.id,
              content: newMessage.content,
              createdAt: new Date(newMessage.createdAt),
              senderId: newMessage.senderId,
              messageType: newMessage.messageType as
                | "TEXT"
                | "IMAGE"
                | "SYSTEM",
              isRead: false,
              sender: null,
            };

            // 중복 방지: DB에서 로드한 메시지와 브로드캐스트 메시지가 겹치지 않도록
            setMessages((prev) => {
              const exists = prev.some(
                (msg) =>
                  msg.content === messageData.content &&
                  msg.senderId === messageData.senderId &&
                  Math.abs(
                    new Date(msg.createdAt).getTime() -
                      new Date(messageData.createdAt).getTime()
                  ) < 5000
              );

              if (exists) {
                return prev;
              }

              return [...prev, messageData];
            });

            // 새 메시지가 오면 스크롤을 맨 아래로
            setTimeout(() => {
              if (messagesEndRef.current) {
                const container = messagesContainerRef.current;
                if (container) {
                  const isAtBottom =
                    container.scrollHeight -
                      container.scrollTop -
                      container.clientHeight <
                    100;

                  if (isAtBottom || newMessage.senderId === userId) {
                    messagesEndRef.current.scrollIntoView({
                      behavior: "smooth",
                    });
                  }
                }
              }
            }, 100);
          }
        })
        .subscribe((status) => {
          console.log(`[ChatRoom] 채널 상태: ${status}`);

          if (status === "SUBSCRIBED") {
            setIsConnecting(false);
            setError(null);
            updateActivity(); // 연결 시 활동 시작
          } else if (status === "CHANNEL_ERROR") {
            setIsConnecting(false);
            setError(new Error("채널 연결 오류가 발생했습니다."));
          } else if (status === "CLOSED") {
            setIsConnecting(false);
          }
        });

      channelRef.current = channel;
    }, delay);

    // cleanup
    return () => {
      mounted = false;
      clearTimeout(timer);

      console.log(`[ChatRoom] 채널 cleanup: ${roomId}`);

      // 타이머 정리
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (modalTimerRef.current) {
        clearTimeout(modalTimerRef.current);
      }

      // Supabase 공식 문서에 따라 removeChannel 사용
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomId, userId, updateActivity]);

  // 메시지 전송 핸들러 (브로드캐스트 + DB 저장)
  const handleSendMessage = useCallback(
    async (content: string) => {
      try {
        if (!channelRef.current) {
          throw new Error("채널이 연결되지 않았습니다.");
        }

        // 임시 메시지 ID 생성
        const tempId = `temp-${Date.now()}-${Math.random()}`;
        const now = new Date().toISOString();

        // 브로드캐스트 메시지 객체 생성
        const broadcastMessage = {
          id: tempId,
          roomId: roomId,
          senderId: userId,
          content: content,
          messageType: "TEXT",
          createdAt: now,
          sender: {
            id: userId,
            name: "Current User",
            profileImageUrl: undefined,
          },
        };

        // 1. 브로드캐스트로 즉시 전송 (UI 즉각 반영)
        const result = await channelRef.current.send({
          type: "broadcast",
          event: "new-message",
          payload: broadcastMessage,
        });

        console.log("[ChatRoom] 메시지 전송 결과:", result);

        // 메시지 전송 시 활동 업데이트
        updateActivity();

        // 2. DB에 저장 (백그라운드에서 처리)
        sendMessageToAPI(roomId, content).catch((error) => {
          console.error("[Chat] Failed to save message to DB:", error);
          // TODO: 실패 시 재시도 로직 또는 사용자 알림
        });

        // 메시지 전송 후 스크롤
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } catch (error) {
        console.error("[Chat] Failed to send message:", error);
        alert("메시지 전송에 실패했습니다.");
      }
    },
    [roomId, userId, updateActivity]
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
    <div className="flex flex-col h-full bg-white relative">
      {/* 연결 상태 표시 */}
      {isConnecting && (
        <div className="absolute top-0 left-0 right-0 bg-blue-500 text-white px-4 py-2 text-center text-sm">
          채팅방 연결 중...
        </div>
      )}

      {/* 비활성 타임아웃 모달 */}
      {showInactivityModal && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              세션 타임아웃 경고
            </h3>
            <p className="text-gray-600 mb-4">
              3분 동안 활동이 없었습니다. 계속하시려면 &apos;연장&apos;을
              선택하세요. 2분 내에 응답하지 않으면 자동으로 종료됩니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleEndSession}
                className="flex-1 bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                종료
              </button>
              <button
                onClick={handleExtendSession}
                className="flex-1 bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                연장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 연결 오류 모달 */}
      {error && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              연결 오류
            </h3>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              새로고침
            </button>
          </div>
        </div>
      )}

      {/* 상단 스크롤 영역 (헤더 + 메시지) */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* 채팅방 헤더 */}
        <div className="border-b border-gray-200 p-4 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* 상대방 아바타 */}
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
              {roomInfo.otherUser?.avatar ? (
                <Image
                  src={roomInfo.otherUser.avatar}
                  alt={`${roomInfo.otherUser.username} 프로필 이미지`}
                  width={40}
                  height={40}
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
              (index === 0 ||
                messages[index - 1].senderId !== message.senderId);

            return (
              <ChatMessage
                key={message.id}
                message={message}
                isOwn={isOwn}
                showAvatar={showAvatar}
              />
            );
          })}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 메시지 입력 영역 - 하단 고정 */}
      <div className="flex-shrink-0">
        <ChatInput
          onSendMessage={handleSendMessage}
          placeholder={`${
            roomInfo.otherUser?.username || "상대방"
          }에게 메시지 보내기`}
        />
      </div>
    </div>
  );
}
