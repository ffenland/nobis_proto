import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextRequest, NextResponse } from "next/server";
import {
  getManagerProfile,
  updateManagerProfile,
  UpdateManagerProfileInput,
} from "@/app/services/master/profile.service";
import { logApiError } from "@/app/services/error/error-logging.service";

export const GET = async (request: NextRequest) => {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  try {
    const profile = await getManagerProfile(sessionOrResponse.id);
    return NextResponse.json(profile);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_MASTER_PROFILE_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getManagerProfile",
      },
      tags: ["api", "master", "profile"],
    });

    return NextResponse.json(
      { error: "프로필 정보를 불러올 수 없습니다." },
      { status: 500 }
    );
  }
};

export const PUT = async (request: NextRequest) => {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  try {
    const data: UpdateManagerProfileInput = await request.json();

    const updatedProfile = await updateManagerProfile(sessionOrResponse.id, data);
    return NextResponse.json(updatedProfile);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_MASTER_PROFILE_002",
      userId: sessionOrResponse.id,
      metadata: {
        action: "updateManagerProfile",
      },
      tags: ["api", "master", "profile", "update"],
    });

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "프로필 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
};
