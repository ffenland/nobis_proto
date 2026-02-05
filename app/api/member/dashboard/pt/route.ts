import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getPt } from "@/app/services/member/dashboard.service";
import { logApiError } from "@/app/services/error/error-logging.service";

export async function GET(request: NextRequest) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MEMBER") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const pt = await getPt(sessionOrResponse.roleId);

    return NextResponse.json(pt);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_MEMBER_DASHBOARD_PT_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getPt",
      },
      tags: ["api", "member", "dashboard", "pt"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
