"use server";
import { getIronSession } from "iron-session";
import type { IronSession } from "iron-session";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export interface SessionContent {
  id?: string;
  role?: "MEMBER" | "TRAINER" | "MANAGER";
  roleId?: string;
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

export const getSession = async () => {
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

export const getSessionOrRedirect = async (): Promise<
  IronSession<SessionContent & { id: string; role: string; roleId: string }>
> => {
  // for server components
  const session = await getSession();

  if (isSessionWithIdAndRole(session)) {
    return session;
  } else {
    return redirect("/");
  }
};

export const logoutSession = async () => {
  const session = await getSession();
  session.destroy();
  redirect("/login");
};

export const logoutCurrentSession = async (
  session: IronSession<SessionContent>
) => {
  session.destroy();
  redirect("/login");
};
