"use client";

import React from "react";
import Link from "next/link";
import { MessageCircle, ChevronRight } from "lucide-react";
import { useUnreadCount } from "@/app/hooks/useUnreadCount";

interface IUnreadMessageAlertProps {
  userRole: "MEMBER" | "TRAINER" | "MANAGER";
  className?: string;
}

export function UnreadMessageAlert({
  userRole,
  className = "",
}: IUnreadMessageAlertProps) {
  const { unreadCount, isLoading } = useUnreadCount();

  // 안읽은 메시지가 없으면 렌더링하지 않음
  if (isLoading || unreadCount === 0) {
    return null;
  }

  const chatPath = `/${userRole.toLowerCase()}/chat`;

  return (
    <Link
      href={chatPath}
      className={`
        block p-4 bg-blue-50 border border-blue-200 rounded-lg 
        hover:bg-blue-100 transition-colors
        ${className}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <MessageCircle size={24} className="text-blue-600" />
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </div>
          </div>

          <div>
            <h3 className="font-medium text-blue-900">새로운 메시지</h3>
            <p className="text-sm text-blue-700">
              읽지 않은 메시지가 {unreadCount}건 있습니다
            </p>
          </div>
        </div>

        <ChevronRight size={20} className="text-blue-600" />
      </div>
    </Link>
  );
}
