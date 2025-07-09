// app/components/base/c_logout_button.tsx
"use client";

import { useState } from "react";
import useSWR from "swr";
import { logoutSession } from "@/app/lib/session";
import type { IUserInfo } from "@/app/lib/services/user-info.service";

interface ClientLogoutButtonProps {
  userType: 'member' | 'trainer';
  className?: string;
}

// API 호출 함수
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

const ClientLogoutButton = ({ userType, className = '' }: ClientLogoutButtonProps) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // 사용자 정보 조회
  const { data: userInfo, error } = useSWR<IUserInfo>(
    `/api/${userType}/info`,
    fetcher
  );

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    try {
      // 서버 액션 호출
      await logoutSession();
    } catch (error) {
      console.error("로그아웃 실패:", error);
      setIsLoggingOut(false);
    }
  };

  // 로딩 중이거나 에러가 있으면 로그아웃 버튼만 표시
  if (!userInfo || error) {
    return (
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className={`px-3 py-1.5 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md border border-gray-300 transition-colors font-medium disabled:opacity-50 ${className}`}
      >
        {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end space-y-2">
      <div className="text-sm text-gray-600">
        <span className="font-medium text-gray-900">{userInfo.username}</span>님 안녕하세요
      </div>
      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        className={`px-3 py-1.5 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md border border-gray-300 transition-colors font-medium disabled:opacity-50 ${className}`}
      >
        {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
      </button>
    </div>
  );
};

export default ClientLogoutButton;