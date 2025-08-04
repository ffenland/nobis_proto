import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import {
  changeUserRole,
  canChangeRole,
} from "@/app/lib/services/role-management.service";
import { ErrorReporter } from "@/app/lib/utils/error-reporter";
import { UserRole } from "@prisma/client";

interface ChangeRoleRequest {
  userId: string;
  newRole: UserRole;
  fitnessCenterId?: string;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  try {
    // Manager 권한 확인
    if (
      !session ||
      !session.id ||
      session.role !== "MANAGER" ||
      !session.roleId
    ) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body: ChangeRoleRequest = await request.json();
    const { userId, newRole, fitnessCenterId } = body;

    // 유효성 검증
    if (!userId || !newRole) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 유효한 role인지 확인
    if (!Object.values(UserRole).includes(newRole)) {
      return NextResponse.json(
        { error: "유효하지 않은 역할입니다." },
        { status: 400 }
      );
    }

    // TRAINER나 MANAGER로 변경 시 fitnessCenterId 필수
    if (
      (newRole === UserRole.TRAINER || newRole === UserRole.MANAGER) &&
      !fitnessCenterId
    ) {
      return NextResponse.json(
        { error: "피트니스 센터를 선택해주세요." },
        { status: 400 }
      );
    }

    // 역할 변경 가능 여부 확인
    const canChange = await canChangeRole(userId);
    if (!canChange.canChange) {
      return NextResponse.json({ error: canChange.reason }, { status: 400 });
    }

    // 역할 변경 수행
    const result = await changeUserRole(
      userId,
      newRole,
      session.roleId, // managerId
      fitnessCenterId
    );

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      newRole: result.newRole,
    });
  } catch (error) {
    await ErrorReporter.report(error, {
      action: "change-user-role",
      userId: session?.id ?? undefined,
      metadata: {
        description: "사용자 역할 변경 중 오류",
      },
    });

    return NextResponse.json(
      { error: "역할 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
