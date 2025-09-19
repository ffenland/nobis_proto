"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { ChevronDown, LogOut, UserCog, Users, AlertTriangle, Phone } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { logoutUser } from "@/app/services/auth/auth.service";
import { UserRole } from "@prisma/client";

interface UserDropdownMenuProps {
  username: string;
  role?: UserRole;
  showRoleSwitch?: boolean;
  targetRole?: "TRAINER" | "MANAGER";
  className?: string;
  hasMobile: boolean;
}

export default function UserDropdownMenu({
  username,
  role,
  showRoleSwitch = false,
  targetRole,
  className,
  hasMobile,
}: UserDropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { mutate } = useSWRConfig();

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRoleSwitch = async () => {
    setIsLoading(true);

    try {
      // 통합된 role-switch API 엔드포인트 사용
      const response = await fetch("/api/auth/role-switch", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // SWR 캐시 무효화 - GlobalHeader가 즉시 업데이트되도록
        await mutate("/api/auth/session");

        // 대상 페이지로 리다이렉트
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
      await mutate("/api/auth/session", null, false);

      // 로그인 페이지로 리다이렉트
      router.push("/login");
    } catch (error) {
      console.error("로그아웃 실패:", error);

      // 에러가 발생해도 로그인 페이지로 보냄 (안전장치)
      await mutate("/api/auth/session", null, false);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const roleSwitchText =
    targetRole === "TRAINER" ? "트레이너로 전환" : "매니저로 전환";

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap relative",
          !hasMobile 
            ? "text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200" 
            : "text-gray-900 hover:bg-gray-100"
        )}
        disabled={isLoading}
      >
        <span className="flex items-center gap-1">
          {!hasMobile && (
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          )}
          {username}
        </span>
        <ChevronDown
          className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-64 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
          {/* 전화번호 미등록 경고 */}
          {!hasMobile && (
            <>
              <div className="px-4 py-3 bg-orange-50 border-l-4 border-orange-400 mx-2 my-2 rounded-r">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-800">
                      전화번호 미등록
                    </p>
                    <p className="text-xs text-orange-700 mt-1">
                      PT 신청을 위해 전화번호 등록이 필요합니다
                    </p>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        router.push(`/${role?.toLowerCase()}/profile`);
                      }}
                      className="inline-flex items-center gap-1 mt-2 text-xs text-orange-600 hover:text-orange-800 font-medium transition-colors"
                    >
                      <Phone className="w-3 h-3" />
                      프로필에서 등록하기
                    </button>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-200 my-1" />
            </>
          )}

          {showRoleSwitch && targetRole && (
            <>
              <button
                onClick={handleRoleSwitch}
                disabled={isLoading}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <Users className="w-4 h-4" />
                <span>{isLoading ? "전환 중..." : roleSwitchText}</span>
              </button>
              <div className="border-t border-gray-200 my-1" />
            </>
          )}
          {role && (
            <button
              onClick={() => {
                setIsOpen(false);
                router.push(`/${role.toLowerCase()}/profile`);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <UserCog className="w-4 h-4" />
              <span>프로필</span>
            </button>
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
