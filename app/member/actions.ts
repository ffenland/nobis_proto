"use server";
import {
  getSession,
  logoutCurrentSession,
  logoutSession,
} from "@/app/lib/session";
import prisma from "@/app/lib/prisma";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

export type IMainMember = Prisma.PromiseReturnType<typeof getMemberInfo>;

export const getMemberInfo = async () => {
  // 로그인된 회원의 기초 정보를 받아온다.
  const session = await getSession();
  if (!session) {
    return redirect("/login");
  }
  if (session.role !== "MEMBER") {
    return redirect("/login");
  }
  const memberId = session.roleId;
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      user: { select: { username: true } },
    },
  });
  if (!member) {
    return redirect("/login");
  }
  // user found
  return {
    username: member.user.username,
  };
};
