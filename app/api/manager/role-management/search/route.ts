import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { searchUserByUsername } from "@/app/lib/services/role-management.service";
import { ErrorReporter } from "@/app/lib/utils/error-reporter";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    // Manager 권한 확인
    if (!session || !session.id || session.role !== "MANAGER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get("username") || "";

    const users = await searchUserByUsername(username.trim());

    return NextResponse.json({
      success: true,
      users,
      count: users.length,
    });
  } catch (error) {
    await ErrorReporter.report(error, {
      action: "search-user-for-role-change",
      metadata: {
        description: "역할 변경을 위한 사용자 검색 중 오류",
      },
    });

    return NextResponse.json(
      { error: "사용자 검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
