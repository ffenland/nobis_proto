// app/components/base/c_logout_button.tsx
"use client";

import { useState } from "react";
import { logoutSession } from "@/app/lib/session";

interface ClientLogoutButtonProps {
  className?: string;
}

const ClientLogoutButton = ({ className = '' }: ClientLogoutButtonProps) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={`px-3 py-1.5 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md border border-gray-300 transition-colors font-medium disabled:opacity-50 ${className}`}
    >
      {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
    </button>
  );
};

export default ClientLogoutButton;