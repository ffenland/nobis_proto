import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { checkPendingPt } from "@/app/services/member/pt/pt.service";
import { logApiError } from "@/app/services/error/error-logging.service";

export async function GET(request: NextRequest) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MEMBER") {
    return NextResponse.json(
      { error: "권한이 없습니다." },
      { status: 403 }
    );
  }

  try {
    const result = await checkPendingPt(sessionOrResponse.roleId);

    return NextResponse.json(result);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_MEMBER_PT_CHECK_PENDING_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "checkPendingPt",
      },
      tags: ["api", "member", "pt", "check-pending"],
    });

    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
