// app/api/member/profile/avatar/route.ts
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

    const { mediaId } = await request.json();

    const userService = UserService.getInstance();

    if (mediaId) {
      await userService.setAvatar(session.id, mediaId);
    } else {
      await userService.removeAvatar(session.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Avatar update error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "아바타 업데이트 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();

    if (session.role !== "MEMBER") {
      return NextResponse.json(
        { error: "회원만 접근 가능합니다." },
        { status: 403 }
      );
    }

    const userService = UserService.getInstance();
    await userService.removeAvatar(session.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Avatar removal error:", error);
    return NextResponse.json(
      { error: "아바타 제거 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
