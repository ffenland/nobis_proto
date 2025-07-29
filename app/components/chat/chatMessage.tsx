"use client";

import React from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { IMessageData } from "@/app/lib/services/chat.service";

interface IChatMessageProps {
  message: IMessageData;
  isOwn: boolean;
  showAvatar?: boolean;
}

export function ChatMessage({
  message,
  isOwn,
  showAvatar = true,
}: IChatMessageProps) {
  return (
    <div
      className={`flex gap-3 mb-4 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* 아바타 */}
      {showAvatar && !isOwn && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
            {message.sender?.avatarMedia?.thumbnailUrl ||
            message.sender?.avatarMedia?.publicUrl ? (
              <img
                src={
                  message.sender.avatarMedia.thumbnailUrl ||
                  message.sender.avatarMedia.publicUrl
                }
                alt={message.sender.username || "사용자"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-gray-600">
                {message.sender?.username?.charAt(0).toUpperCase() || "?"}
              </span>
            )}
          </div>
        </div>
      )}

      <div
        className={`flex flex-col max-w-[70%] ${
          isOwn ? "items-end" : "items-start"
        }`}
      >
        {/* 발송자 이름 (상대방 메시지일 때만) */}
        {!isOwn && message.sender && (
          <div className="text-xs text-gray-500 mb-1 px-1">
            {message.sender.username}
          </div>
        )}

        {/* 메시지 내용 */}
        <div
          className={`
            px-4 py-2 rounded-2xl max-w-full break-words
            ${
              isOwn
                ? "bg-gray-900 text-white rounded-br-md"
                : "bg-gray-100 text-gray-900 rounded-bl-md"
            }
          `}
        >
          {message.messageType === "TEXT" && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          )}
          {message.messageType === "SYSTEM" && (
            <p className="text-xs text-gray-500 italic">{message.content}</p>
          )}
        </div>

        {/* 시간 */}
        <div className={`mt-1 px-1`}>
          <time className="text-xs text-gray-500">
            {format(new Date(message.createdAt), "HH:mm", { locale: ko })}
          </time>
        </div>
      </div>
    </div>
  );
}
