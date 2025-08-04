import { NextRequest, NextResponse } from "next/server";
import { getSession, getCurrentIronSession } from "@/app/lib/session";
import { verifyRoleManagementPassword } from "@/app/lib/services/role-management.service";
import { ErrorReporter } from "@/app/lib/utils/error-reporter";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    // Manager 권한 확인
    if (!session || !session.id || session.role !== "MANAGER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: "비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    const isValid = await verifyRoleManagementPassword(password);

    if (!isValid) {
      return NextResponse.json(
        { error: "비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    // 세션에 인증 상태 저장
    const ironSession = await getCurrentIronSession();
    ironSession.roleManagementAuth = true;
    ironSession.roleManagementAuthTime = Date.now();
    await ironSession.save();

    return NextResponse.json({
      success: true,
      message: "인증되었습니다.",
    });
  } catch (error) {
    await ErrorReporter.report(error, {
      action: "verify-role-management-password",
      metadata: {
        description: "역할 관리 비밀번호 인증 중 오류",
      },
    });

    return NextResponse.json(
      { error: "인증 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
