"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";

interface IChatPageTemplateProps {
  title: string;
  userRole: "MEMBER" | "TRAINER" | "MANAGER";
  showBackButton?: boolean;
  backButtonText?: string;
  children: React.ReactNode;
}

export function ChatPageTemplate({
  title,
  userRole,
  showBackButton = true,
  backButtonText = "뒤로",
  children,
}: IChatPageTemplateProps) {
  const dashboardPath = `/${userRole.toLowerCase()}/dashboard`;
  const chatListPath = `/${userRole.toLowerCase()}/chat`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showBackButton && (
                <Link
                  href={chatListPath}
                  className="p-1 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft size={20} />
                </Link>
              )}

              <div className="flex items-center gap-2">
                <MessageCircle size={20} className="text-gray-700" />
                <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
              </div>
            </div>

            {/* 대시보드로 이동 버튼 */}
            <Link
              href={dashboardPath}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              대시보드
            </Link>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-2xl mx-auto">{children}</main>
    </div>
  );
}
