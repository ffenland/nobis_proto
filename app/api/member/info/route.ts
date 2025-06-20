// app/api/member/info/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import prisma from "@/app/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "MEMBER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const member = await prisma.member.findUnique({
      where: { id: session.roleId },
      select: {
        user: { select: { username: true } },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "회원 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      username: member.user.username,
    });
  } catch (error) {
    console.error("Member info 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
