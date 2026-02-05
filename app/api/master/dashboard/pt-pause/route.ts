import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { getUncheckedPtPausesCount } from "@/app/services/master/dashboard.service";
import { logApiError } from "@/app/services/error/error-logging.service";

export async function GET(request: NextRequest) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const centerStats = await getUncheckedPtPausesCount(
      sessionOrResponse.roleId
    );
    return NextResponse.json(centerStats);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "PT_PAUSE_DASHBOARD_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getUncheckedPtPausesCount",
      },
      tags: ["api", "master", "dashboard", "pt-pause"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
