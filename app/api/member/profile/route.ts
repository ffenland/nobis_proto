import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextRequest, NextResponse } from "next/server";
import {
  getMemberProfile,
  updateMemberProfile,
  UpdateMemberProfileInput,
} from "@/app/services/member/profile.service";
import { logApiError } from "@/app/services/error/error-logging.service";

export async function GET(request: NextRequest) {
  // 1. 세션 확인
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 3. 비즈니스 로직
  try {
    const profile = await getMemberProfile(sessionOrResponse.id);

    return NextResponse.json(profile);
  } catch (error) {
    // 4. 에러 로깅
    await logApiError(request, error as Error, {
      errorCode: "MEMBER_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getMemberProfile",
      },
      tags: ["member", "profile"],
    });

    return NextResponse.json(
      { error: "프로필 정보를 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  // 1. 세션 확인
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 3. 비즈니스 로직
  try {
    const data: UpdateMemberProfileInput = await request.json();
    const updatedProfile = await updateMemberProfile(
      sessionOrResponse.id,
      data
    );
    return NextResponse.json(updatedProfile);
  } catch (error) {
    // 4. 에러 로깅
    await logApiError(request, error as Error, {
      errorCode: "MEMBER_002",
      userId: sessionOrResponse.id,
      metadata: {
        action: "updateMemberProfile",
      },
      tags: ["member", "profile"],
    });

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "프로필 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
