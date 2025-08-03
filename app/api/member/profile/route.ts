// app/api/member/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import {
  UserService,
  type IUpdateProfileRequest,
} from "@/app/lib/services/user.service";

export async function GET() {
  try {
    const session = await getSessionOrRedirect();

    if (session.role !== "MEMBER") {
      return NextResponse.json(
        { error: "회원만 접근 가능합니다." },
        { status: 403 }
      );
    }

    const userService = UserService.getInstance();
    const profile = await userService.getMemberProfile(session.id);

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "프로필 조회 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();

    if (session.role !== "MEMBER") {
      return NextResponse.json(
        { error: "회원만 접근 가능합니다." },
        { status: 403 }
      );
    }

    const body: IUpdateProfileRequest = await request.json();

    const userService = UserService.getInstance();
    const updatedProfile = await userService.updateProfile(session.id, body);

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "프로필 업데이트 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
