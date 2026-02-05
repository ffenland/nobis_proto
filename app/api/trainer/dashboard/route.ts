import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getTrainerDashboard } from "@/app/services/trainer/dashboard.service";
import { logApiError } from "@/app/services/error/error-logging.service";

export async function GET(request: NextRequest) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  try {
    const dashboard = await getTrainerDashboard(sessionOrResponse.roleId);

    return NextResponse.json(dashboard);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_TRAINER_DASHBOARD_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getTrainerDashboard",
      },
      tags: ["api", "trainer", "dashboard"],
    });

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
