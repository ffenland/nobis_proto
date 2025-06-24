"use client";

import React from "react";
import Link from "next/link";
import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { MessageCircle } from "lucide-react";
import type { IChatRoomsData } from "@/app/lib/services/chat.service";

interface IChatListProps {
  userRole: "MEMBER" | "TRAINER" | "MANAGER";
}

const fetchChatRooms = async (
  url: string
): Promise<{ success: boolean; data: IChatRoomsData }> => {
  const response = await fetch(url);
  return response.json();
};

export function ChatList({ userRole }: IChatListProps) {
  const {
    data: result,
    error,
    isLoading,
  } = useSWR("/api/chat/rooms", fetchChatRooms, {
    refreshInterval: 30000, // 30초마다 새로고침
  });

  const chatRooms = result?.success ? result.data : [];
  const totalUnreadCount = chatRooms.reduce(
    (sum, room) => sum + room.unreadCount,
    0
  );

  const basePath = `/${userRole.toLowerCase()}/chat`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          <span>채팅 목록을 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center text-gray-500">
          <MessageCircle size={48} className="mx-auto mb-2 text-gray-300" />
          <p>채팅 목록을 불러올 수 없습니다.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (chatRooms.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-gray-500">
          <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="font-medium mb-2">아직 채팅방이 없습니다</h3>
          <p className="text-sm">
            {userRole === "MEMBER" &&
              "트레이너와 PT 수업을 신청하면 채팅방이 생성됩니다."}
            {userRole === "TRAINER" &&
              "회원이 PT를 신청하면 채팅방이 생성됩니다."}
            {userRole === "MANAGER" && "채팅 기능을 통해 소통할 수 있습니다."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 헤더 정보 */}
      {totalUnreadCount > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700">
            <MessageCircle size={16} />
            <span className="text-sm font-medium">
              읽지 않은 메시지가 {totalUnreadCount}건 있습니다
            </span>
          </div>
        </div>
      )}

      {/* 채팅방 목록 */}
      <div className="space-y-1">
        {chatRooms.map((room) => (
          <Link
            key={room.id}
            href={`${basePath}/${room.id}`}
            className="block p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* 상대방 아바타 */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                  {room.otherUser?.avatar ? (
                    <img
                      src={room.otherUser.avatar}
                      alt={room.otherUser.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm text-gray-600">
                      {room.otherUser?.username?.charAt(0).toUpperCase() || "?"}
                    </span>
                  )}
                </div>

                {/* 안읽은 메시지 뱃지 */}
                {room.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                    {room.unreadCount > 99 ? "99+" : room.unreadCount}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {/* 상대방 이름 및 역할 */}
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {room.otherUser?.username || "알 수 없음"}
                  </h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {room.otherUser?.role === "TRAINER"
                      ? "트레이너"
                      : room.otherUser?.role === "MEMBER"
                      ? "회원"
                      : "매니저"}
                  </span>
                </div>

                {/* 마지막 메시지 */}
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`text-sm truncate flex-1 ${
                      room.unreadCount > 0
                        ? "text-gray-900 font-medium"
                        : "text-gray-600"
                    }`}
                  >
                    {room.lastMessage ? (
                      <>
                        {room.lastMessage.isMine && (
                          <span className="text-gray-500">나: </span>
                        )}
                        {room.lastMessage.content}
                        {/* 읽음 상태 표시 (내가 보낸 메시지일 때) */}
                        {room.lastMessage.isMine && (
                          <span
                            className={`ml-1 text-xs ${
                              room.lastMessage.isRead
                                ? "text-blue-500"
                                : "text-gray-400"
                            }`}
                          >
                            {room.lastMessage.isRead ? "읽음" : "안읽음"}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400 italic">
                        메시지가 없습니다
                      </span>
                    )}
                  </p>

                  {/* 시간 */}
                  {room.lastMessage && (
                    <time className="text-xs text-gray-400 flex-shrink-0">
                      {formatDistanceToNow(
                        new Date(room.lastMessage.createdAt),
                        {
                          addSuffix: true,
                          locale: ko,
                        }
                      )}
                    </time>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
