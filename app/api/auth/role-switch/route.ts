import { NextRequest, NextResponse } from "next/server";
import { getSession, getCurrentIronSession } from "@/app/lib/session";
import { switchUserRole } from "@/app/services/auth/auth.service";
import { logApiError } from "@/app/services/error/error-logging.service";

export async function POST(request: NextRequest) {
  let session;
  try {
    // 현재 세션 확인
    session = await getSession();

    if (!session || !session.id || !session.role || !session.roleId) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    // 권한 확인 - TRAINER 또는 MANAGER만 가능
    if (session.role !== "TRAINER" && session.role !== "MANAGER") {
      return NextResponse.json(
        { error: "역할 전환 권한이 없습니다" },
        { status: 403 }
      );
    }

    // 서비스 로직 호출
    const result = await switchUserRole(
      session.id,
      session.role as "TRAINER" | "MANAGER"
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "역할 전환에 실패했습니다" },
        { status: result.error === "매니저 권한이 없습니다" ? 403 : 400 }
      );
    }

    // 세션 업데이트
    const ironSession = await getCurrentIronSession();
    ironSession.role = result.newRole;
    ironSession.roleId = result.newRoleId;
    await ironSession.save();

    // 리다이렉트 URL 결정
    const redirectUrl = result.newRole === "TRAINER" ? "/trainer" : "/manager";

    return NextResponse.json({
      success: true,
      role: result.newRole,
      redirectUrl
    });

  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "AUTH_004",
      userId: session?.id,
      metadata: {
        action: "roleSwitch",
        currentRole: session?.role,
      },
      tags: ["auth", "role-switch"],
    });

    return NextResponse.json(
      { error: "역할 전환 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}