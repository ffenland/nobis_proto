"use server";
import { getIronSession } from "iron-session";
import type { IronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { clearSentryUser } from "./utils/sentry-session";

export interface SessionContent {
  id?: string;
  role?: "MEMBER" | "TRAINER" | "MANAGER";
  roleId?: string;
  roleManagementAuth?: boolean;
  roleManagementAuthTime?: number;
}

// type guard
const isSessionWithIdAndRole = (
  session: SessionContent
): session is SessionContent & { id: string; role: string; roleId: string } => {
  return (
    typeof session.id === "string" &&
    (session.role === "MEMBER" ||
      session.role === "TRAINER" ||
      session.role === "MANAGER") &&
    typeof session.roleId === "string"
  );
};

export const getCurrentIronSession = async () => {
  const cookieStore = await cookies();

  const session = await getIronSession<SessionContent>(cookieStore, {
    cookieName: "nobisgym",
    password: process.env.COOKIE_PASSWORD!,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24시간
    },
  });

  return session;
};

export const getSessionOrRedirect = async (): Promise<{
  id: string;
  role: string;
  roleId: string;
}> => {
  // for server components - legacy function, consider using getSession() with manual redirect
  const session = await getSession();

  if (session) {
    return session;
  } else {
    return redirect("/");
  }
};

export const logoutSession = async () => {
  const session = await getCurrentIronSession();
  session.destroy();
  clearSentryUser();
  redirect("/login");
};

export const logoutCurrentSession = async (
  session: IronSession<SessionContent>
) => {
  session.destroy();
  clearSentryUser();
  redirect("/login");
};

export const getSession = async (): Promise<{
  id: string;
  role: string;
  roleId: string;
} | null> => {
  // Main authentication function for both API routes and server actions
  const session = await getCurrentIronSession();

  if (isSessionWithIdAndRole(session)) {
    return {
      id: session.id,
      role: session.role,
      roleId: session.roleId,
    };
  } else {
    return null;
  }
};

export const createSession = async (sessionData: {
  id: string;
  role: "MEMBER" | "TRAINER" | "MANAGER";
  roleId: string;
}) => {
  const session = await getCurrentIronSession();
  session.id = sessionData.id;
  session.role = sessionData.role;
  session.roleId = sessionData.roleId;
  await session.save();
};

// API 라우트 전용 헬퍼 함수 - 세션이 없거나 불완전하면 NextResponse 401 반환
export const getSessionOrReturn401 = async () => {
  const session = await getSession();

  // 세션이 없거나 필수 정보(id, role, roleId)가 하나라도 없으면 401 반환
  if (!session || !session.id || !session.role || !session.roleId) {
    // 동적 import로 NextResponse 가져오기 (서버 전용)
    const { NextResponse } = await import("next/server");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return session;
};
