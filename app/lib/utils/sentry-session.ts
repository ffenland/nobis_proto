import { ErrorReporter } from "./error-reporter";
import type { UserRole } from "@prisma/client";

interface SentryUserInfo {
  id: string;
  email?: string;
  username?: string;
  role: UserRole;
  roleId: string;
  centerId?: string;
}

/**
 * Sentry에 사용자 정보를 설정하는 헬퍼 함수
 * 로그인 성공 시 호출
 */
export function setSentryUser(user: SentryUserInfo) {
  ErrorReporter.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  });

  // 추가 컨텍스트 설정
  ErrorReporter.setContext("session", {
    roleId: user.roleId,
    role: user.role,
    centerId: user.centerId,
    loginTime: new Date().toISOString(),
  });

  // 역할별 태그 설정
  ErrorReporter.setTag("user.role", user.role);
  if (user.centerId) {
    ErrorReporter.setTag("user.centerId", user.centerId);
  }
}

/**
 * Sentry에서 사용자 정보를 제거하는 헬퍼 함수
 * 로그아웃 시 호출
 */
export function clearSentryUser() {
  ErrorReporter.setUser(null);
  ErrorReporter.setContext("session", null);
}

/**
 * 현재 세션 정보를 Sentry 컨텍스트에 업데이트
 * 페이지 로드 시 사용
 */
export async function updateSentryContext(session: any) {
  if (!session) {
    clearSentryUser();
    return;
  }

  setSentryUser({
    id: session.id,
    email: session.email,
    username: session.username,
    role: session.role,
    roleId: session.roleId,
    centerId: session.centerId,
  });
}