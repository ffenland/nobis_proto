// app/api/auth/session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentIronSession } from "@/app/lib/session";
import {
  getSessionUserInfo,
  type SessionResponse,
} from "@/app/services/auth/auth.service";
import { logApiError } from "@/app/services/error/error-logging.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentIronSession();

    if (session.id && session.role && session.roleId) {
      // 사용자 정보 조회
      const userInfo = await getSessionUserInfo(session.id);

      const response: SessionResponse = {
        isAuthenticated: true,
        user: userInfo,
        role: session.role,
        roleId: session.roleId,
      };

      return NextResponse.json(response);
    } else {
      const response: SessionResponse = {
        isAuthenticated: false,
        user: null,
        role: undefined,
        roleId: undefined,
      };

      return NextResponse.json(response);
    }
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "AUTH_001",
      metadata: {
        action: "getSession",
      },
      tags: ["auth", "session"],
    });

    return NextResponse.json({ error: "세션 조회 실패" }, { status: 500 });
  }
}
