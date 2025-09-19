"use client";

import useSWR from "swr";
import UserDropdownMenu from "@/app/components/base/UserDropdownMenu";
import { LoadingSpinner } from "@/app/components/ui/Loading";
import type { SessionResponse } from "@/app/services/auth/auth.service";
import Link from "next/link";

const GlobalHeader = () => {
  const { data, error, isLoading } =
    useSWR<SessionResponse>("/api/auth/session");

  if (isLoading) {
    return (
      <header className="w-full bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">
              NobisGym PulsePT
            </h1>
          </div>
          <div className="flex items-center">
            <LoadingSpinner size="sm" />
          </div>
        </div>
      </header>
    );
  }

  // 인증되지 않은 경우
  if (error || !data?.isAuthenticated || !data?.user) {
    return (
      <header className="w-full bg-white border-b border-gray-200 px-4 py-3">
        <Link
          href="/login"
          className="flex items-center justify-between max-w-7xl mx-auto"
        >
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">
              NobisGym PulsePT
            </h1>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            로그인해주세요
          </div>
        </Link>
      </header>
    );
  }

  return (
    <header className="w-full bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <Link
          href={`/${data.role?.toLowerCase()}`}
          className="flex items-center"
        >
          <h1 className="text-xl font-bold text-gray-900">NobisGym PulsePT</h1>
        </Link>
        <div className="flex items-center">
          <UserDropdownMenu
            username={data.user.username}
            role={data.role}
            showRoleSwitch={
              (data.role === "TRAINER" && data.user.hasManagerProfile) ||
              data.role === "MANAGER"
            }
            targetRole={
              data.role === "TRAINER"
                ? "MANAGER"
                : data.role === "MANAGER"
                ? "TRAINER"
                : undefined
            }
            hasMobile={data.user.hasMobile}
          />
        </div>
      </div>
    </header>
  );
};

export default GlobalHeader;
