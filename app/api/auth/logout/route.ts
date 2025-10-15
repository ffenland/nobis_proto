// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentIronSession } from "@/app/lib/session";
import { logApiError } from "@/app/services/error/error-logging.service";

export async function POST(request: NextRequest) {
  try {
    // 현재 세션 가져오기
    const session = await getCurrentIronSession();

    // 세션이 존재하지 않아도 성공으로 처리 (이미 로그아웃된 상태)
    if (session.id) {
      // 세션 파괴
      session.destroy();
    }

    return NextResponse.json({
      success: true,
      message: "로그아웃되었습니다."
    });
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "AUTH_003",
      metadata: {
        action: "logout",
      },
      tags: ["auth", "logout"],
    });

    // 로그아웃 실패해도 클라이언트에서는 성공으로 처리하여 로그인 페이지로 보냄
    return NextResponse.json({
      success: true,
      message: "로그아웃되었습니다."
    });
  }
}