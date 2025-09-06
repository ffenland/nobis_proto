"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { ChevronDown, LogOut, UserCog } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { logoutUser } from "@/app/services/auth/auth.service";

interface UserDropdownMenuProps {
  username: string;
  showRoleSwitch?: boolean;
  targetRole?: "TRAINER" | "MANAGER";
  className?: string;
}

export default function UserDropdownMenu({
  username,
  showRoleSwitch = false,
  targetRole,
  className,
}: UserDropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { mutate } = useSWRConfig();

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRoleSwitch = async () => {
    setIsLoading(true);
    
    try {
      const endpoint = targetRole === "TRAINER" 
        ? "/api/manager/switch-role" 
        : "/api/trainer/switch-role";
        
      const response = await fetch(endpoint, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        router.push(data.redirectUrl);
      } else {
        alert(data.error || "역할 전환에 실패했습니다.");
      }
    } catch (error) {
      console.error("Role switch error:", error);
      alert("역할 전환 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      // API를 통해 로그아웃 요청
      await logoutUser();
      
      // SWR 세션 캐시 무효화
      await mutate('/api/auth/session', null, false);
      
      // 로그인 페이지로 리다이렉트
      router.push('/login');
    } catch (error) {
      console.error("로그아웃 실패:", error);
      
      // 에러가 발생해도 로그인 페이지로 보냄 (안전장치)
      await mutate('/api/auth/session', null, false);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const roleSwitchText = targetRole === "TRAINER" ? "트레이너로 전환" : "매니저로 전환";

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-100 rounded-md transition-colors whitespace-nowrap"
        disabled={isLoading}
      >
        <span>{username}</span>
        <ChevronDown 
          className={cn(
            "w-4 h-4 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
          {showRoleSwitch && targetRole && (
            <>
              <button
                onClick={handleRoleSwitch}
                disabled={isLoading}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <UserCog className="w-4 h-4" />
                <span>{isLoading ? "전환 중..." : roleSwitchText}</span>
              </button>
              <div className="border-t border-gray-200 my-1" />
            </>
          )}
          
          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            <span>{isLoading ? "로그아웃 중..." : "로그아웃"}</span>
          </button>
        </div>
      )}
    </div>
  );
}