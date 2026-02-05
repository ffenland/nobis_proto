import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getAllCenters } from "@/app/services/master/dashboard.service";
import { logApiError } from "@/app/services/error/error-logging.service";

export async function GET(request: NextRequest) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json(
      { error: "마스터 권한이 필요합니다." },
      { status: 403 }
    );
  }

  try {
    const managerCenters = await getAllCenters(sessionOrResponse.roleId);

    return NextResponse.json(managerCenters);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_MASTER_DASHBOARD_CENTERS_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getManagerCenters",
      },
      tags: ["api", "dashboard", "master", "centers"],
    });

    return NextResponse.json(
      { error: "센터 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
