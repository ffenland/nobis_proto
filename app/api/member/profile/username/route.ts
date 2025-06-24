// app/api/member/profile/username/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import { UserService } from "@/app/lib/services/user.service";

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();

    if (session.role !== "MEMBER") {
      return NextResponse.json(
        { error: "회원만 접근 가능합니다." },
        { status: 403 }
      );
    }

    const { username } = await request.json();

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "유효한 사용자명을 입력해주세요." },
        { status: 400 }
      );
    }

    if (username.length < 2 || username.length > 20) {
      return NextResponse.json(
        { error: "사용자명은 2-20자 사이여야 합니다." },
        { status: 400 }
      );
    }

    const userService = UserService.getInstance();
    const result = await userService.changeUsername(session.id, username);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Username change error:", error);
    return NextResponse.json(
      { error: "사용자명 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
