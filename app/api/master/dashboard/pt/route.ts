import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { logApiError } from "@/app/services/error/error-logging.service";
import { getPts } from "@/app/services/master/dashboard.service";

export async function GET(request: NextRequest) {
  // 1. 세션 확인 (필수)
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 2. 역할별 권한 확인
  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json(
      { error: "Master 권한이 필요합니다." },
      { status: 403 }
    );
  }

  // 3. 비즈니스 로직
  try {
    const data = await getPts();
    return NextResponse.json(data);
  } catch (error) {
    // 4. 에러 로깅 (필수)
    await logApiError(request, error as Error, {
      errorCode: "API_MASTER_DASHBOARD_PT",
      userId: sessionOrResponse.id,
      metadata: { action: "getPts" },
      tags: ["api", "master", "dashboard", "pt"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
