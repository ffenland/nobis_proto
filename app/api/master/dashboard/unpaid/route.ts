import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { logApiError } from "@/app/services/error/error-logging.service";
import { getUnpaidPtPayments } from "@/app/services/master/dashboard.service";

export async function GET(request: NextRequest) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const unpaidData = await getUnpaidPtPayments(sessionOrResponse.roleId);
    return NextResponse.json(unpaidData);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_MASTER_DASHBOARD_UNPAID",
      userId: sessionOrResponse.id,
      metadata: { action: "getUnpaidPtPayments" },
      tags: ["api", "master", "dashboard", "unpaid"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
