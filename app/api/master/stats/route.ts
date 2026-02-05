import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { logApiError } from "@/app/services/error/error-logging.service";
import { getMonthlyStats } from "@/app/services/master/master-stats.service";

export async function GET(request: NextRequest) {
  // 1. 세션 확인 (필수)
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 2. 역할별 권한 확인 (필요한 경우)
  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. 비즈니스 로직 (try-catch 내부)
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || undefined; // YYYYMM

    const data = await getMonthlyStats(sessionOrResponse.roleId, date);
    return NextResponse.json(data);
  } catch (error) {
    // 4. 에러 로깅 (필수)
    await logApiError(request, error as Error, {
      errorCode: "API_MASTER_STATS",
      userId: sessionOrResponse.id,
      metadata: { action: "getMonthlyStats" },
      tags: ["api", "master", "stats"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
