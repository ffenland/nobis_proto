// app/api/auth/session/route.ts
import { NextResponse } from "next/server";
import { getCurrentIronSession } from "@/app/lib/session";
import { getSessionUserInfo, type SessionResponse } from "@/app/services/auth/auth.service";

export async function GET() {
  try {
    const session = await getCurrentIronSession();

    if (session.id && session.role && session.roleId) {
      // 사용자 정보 조회
      const userInfo = await getSessionUserInfo(
        session.id,
        session.role,
        session.roleId
      );

      const response: SessionResponse = {
        isAuthenticated: true,
        user: userInfo,
        roleManagementAuth: session.roleManagementAuth,
        roleManagementAuthTime: session.roleManagementAuthTime,
      };

      return NextResponse.json(response);
    } else {
      const response: SessionResponse = {
        isAuthenticated: false,
        user: null
      };
      
      return NextResponse.json(response);
    }
  } catch (error) {
    console.error("세션 조회 실패:", error);
    return NextResponse.json({ error: "세션 조회 실패" }, { status: 500 });
  }
}
