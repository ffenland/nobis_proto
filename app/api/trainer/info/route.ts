// app/api/trainer/info/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getTrainerUserInfo } from "@/app/lib/services/user-info.service";
import { logApiError } from "@/app/services/error/error-logging.service";

export async function GET(request: NextRequest) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  try {
    const userInfo = await getTrainerUserInfo();
    return NextResponse.json(userInfo);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_TRAINER_INFO_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getTrainerUserInfo",
      },
      tags: ["api", "trainer", "info"],
    });

    if (error instanceof Error) {
      if (error.message.includes("권한이 필요합니다")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message.includes("찾을 수 없습니다")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}