"use server";
import { getIronSession } from "iron-session";
import type { IronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export interface SessionContent {
  id?: string;
  role?: "MEMBER" | "TRAINER" | "MANAGER" | "MASTER";
  roleId?: string;
}

// 검증된 세션 타입 (모든 필수 필드가 존재하는 세션)
export interface ValidatedSession {
  id: string;
  role: "MEMBER" | "TRAINER" | "MANAGER" | "MASTER";
  roleId: string;
}

// type guard
const isSessionWithIdAndRole = (
  session: SessionContent
): session is ValidatedSession => {
  return (
    typeof session.id === "string" &&
    (session.role === "MEMBER" ||
      session.role === "TRAINER" ||
      session.role === "MANAGER" ||
      session.role === "MASTER") &&
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

export const getSessionOrRedirect = async (): Promise<ValidatedSession> => {
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
  redirect("/login");
};

export const logoutCurrentSession = async (
  session: IronSession<SessionContent>
) => {
  session.destroy();
  redirect("/login");
};

export const getSession = async (): Promise<ValidatedSession | null> => {
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

export const createSession = async (sessionData: ValidatedSession) => {
  const session = await getCurrentIronSession();
  session.id = sessionData.id;
  session.role = sessionData.role;
  session.roleId = sessionData.roleId;
  await session.save();
};

// API 라우트 전용 헬퍼 함수 - 세션이 없거나 불완전하면 NextResponse 401 반환
export const getSessionOrReturn401 = async () => {
  const session = await getSession();

  // 세션이 없으면 401 반환
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // getSession()이 null이 아니면 이미 ValidatedSession 타입 보장됨
  return session;
};
