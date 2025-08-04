"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";

interface IChatPageTemplateProps {
  title: string;
  userRole: "MEMBER" | "TRAINER" | "MANAGER";
  showBackButton?: boolean;
  children: React.ReactNode;
}

export function ChatPageTemplate({
  title,
  userRole,
  showBackButton = true,
  children,
}: IChatPageTemplateProps) {
  const chatListPath = `/${userRole.toLowerCase()}/chat`;

  return (
    <div className=" h-full bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0 z-10">
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
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-2xl mx-auto flex-1 flex flex-col min-h-0 w-full">
        {children}
      </main>
    </div>
  );
}
