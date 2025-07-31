// app/api/trainer/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import {
  getTrainerProfileForEditService,
  updateTrainerProfileService,
  checkUsernameAvailabilityService,
} from "@/app/lib/services/trainer.service";

// GET: 트레이너 프로필 수정용 데이터 조회
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    if (session.role !== "TRAINER" || !session.roleId) {
      return NextResponse.json(
        { error: "트레이너만 접근할 수 있습니다." },
        { status: 403 }
      );
    }

    // 세션의 userId로 트레이너 정보 조회
    const trainerProfile = await getTrainerProfileForEditService(
      session.roleId
    );

    return NextResponse.json({
      success: true,
      data: trainerProfile,
    });
  } catch (error) {
    console.error("트레이너 프로필 조회 오류:", error);

    return NextResponse.json(
      {
        error: "프로필 정보를 불러올 수 없습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}

// PUT: 트레이너 프로필 수정
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    if (session.role !== "TRAINER" || !session.roleId) {
      return NextResponse.json(
        { error: "트레이너만 접근할 수 있습니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, introduce, avatarImageId } = body;

    // 입력값 검증
    if (username && typeof username !== "string") {
      return NextResponse.json(
        { error: "사용자명은 문자열이어야 합니다." },
        { status: 400 }
      );
    }

    if (introduce && typeof introduce !== "string") {
      return NextResponse.json(
        { error: "자기소개는 문자열이어야 합니다." },
        { status: 400 }
      );
    }

    if (avatarImageId && typeof avatarImageId !== "string") {
      return NextResponse.json(
        { error: "아바타 이미지 ID는 문자열이어야 합니다." },
        { status: 400 }
      );
    }

    // 사용자명 길이 검증
    if (username && (username.length < 2 || username.length > 20)) {
      return NextResponse.json(
        { error: "사용자명은 2-20자 사이여야 합니다." },
        { status: 400 }
      );
    }

    // 자기소개 길이 검증
    if (introduce && introduce.length > 1000) {
      return NextResponse.json(
        { error: "자기소개는 1000자를 초과할 수 없습니다." },
        { status: 400 }
      );
    }

    // 프로필 업데이트
    const updatedProfile = await updateTrainerProfileService(session.roleId!, {
      username,
      introduce,
      avatarImageId: avatarImageId === "" ? null : avatarImageId,
    });

    return NextResponse.json({
      success: true,
      message: "프로필이 성공적으로 업데이트되었습니다.",
      data: updatedProfile,
    });
  } catch (error) {
    console.error("트레이너 프로필 수정 오류:", error);

    // 중복 사용자명 오류 처리
    if (
      error instanceof Error &&
      error.message.includes("이미 사용중인 사용자명")
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      {
        error: "프로필 수정에 실패했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}

// POST: 사용자명 중복 확인
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    if (session.role !== "TRAINER") {
      return NextResponse.json(
        { error: "트레이너만 접근할 수 있습니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username } = body;

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "사용자명이 필요합니다." },
        { status: 400 }
      );
    }

    if (username.length < 2 || username.length > 20) {
      return NextResponse.json(
        { error: "사용자명은 2-20자 사이여야 합니다." },
        { status: 400 }
      );
    }

    // 사용자명 중복 확인
    const availability = await checkUsernameAvailabilityService(
      username,
      session.id
    );

    return NextResponse.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    console.error("사용자명 중복 확인 오류:", error);

    return NextResponse.json(
      {
        error: "사용자명 확인에 실패했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}
