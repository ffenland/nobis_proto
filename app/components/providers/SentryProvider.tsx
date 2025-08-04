"use client";

import { useEffect } from "react";
import { ErrorReporter } from "@/app/lib/utils/error-reporter";

interface SentryProviderProps {
  children: React.ReactNode;
  user?: {
    id: string;
    email?: string;
    username?: string;
    role: string;
    roleId: string;
    centerId?: string;
  } | null;
}

export function SentryProvider({ children, user }: SentryProviderProps) {
  useEffect(() => {
    if (user) {
      // 클라이언트 사이드에서 Sentry 사용자 정보 설정
      ErrorReporter.setUser({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      });

      ErrorReporter.setContext("session", {
        roleId: user.roleId,
        role: user.role,
        centerId: user.centerId,
        clientSide: true,
      });
    } else {
      // 사용자 정보가 없으면 초기화
      ErrorReporter.setUser(null);
      ErrorReporter.setContext("session", null);
    }
  }, [user]);

  return <>{children}</>;
}