// app/api/master/dashboard/schedule/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getPendingTrainerOffCount } from "@/app/services/master/dashboard.service";
import { logApiError } from "@/app/services/error/error-logging.service";

export async function GET(request: NextRequest) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json(
      { error: "Master 권한이 필요합니다." },
      { status: 403 }
    );
  }

  try {
    const centerStats = await getPendingTrainerOffCount(
      sessionOrResponse.roleId
    );

    return NextResponse.json(centerStats);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_MASTER_DASHBOARD_SCHEDULE_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getPendingTrainerOffCount",
      },
      tags: ["api", "dashboard", "master", "schedule"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
