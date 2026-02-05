// app/api/member/pt/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getMemberActivePt } from "@/app/services/member/pt/pt.service";
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
    const activePt = await getMemberActivePt(sessionOrResponse.roleId);

    return NextResponse.json(activePt);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_MEMBER_PT_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getMemberActivePt",
      },
      tags: ["api", "member", "pt"],
    });

    return NextResponse.json(
      { error: "PT 정보를 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}
