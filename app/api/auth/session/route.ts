// app/api/auth/session/route.ts
import { NextResponse } from "next/server";
import { getCurrentIronSession } from "@/app/lib/session";

export async function GET() {
  try {
    const session = await getCurrentIronSession();

    if (session.id && session.role && session.roleId) {
      return NextResponse.json({
        id: session.id,
        role: session.role,
        roleId: session.roleId,
        roleManagementAuth: session.roleManagementAuth,
        roleManagementAuthTime: session.roleManagementAuthTime,
      });
    } else {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
  } catch (error) {
    console.error("세션 조회 실패:", error);
    return NextResponse.json({ error: "세션 조회 실패" }, { status: 500 });
  }
}
