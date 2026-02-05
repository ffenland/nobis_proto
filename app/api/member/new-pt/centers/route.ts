// app/api/member/new-pt/centers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getFitnessCentersForPtApply } from "@/app/services/member/pt/pt.service";
import { logApiError } from "@/app/services/error/error-logging.service";

export async function GET(request: NextRequest) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MEMBER") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const centers = await getFitnessCentersForPtApply();
    return NextResponse.json(centers);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_MEMBER_PT_CENTERS_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getFitnessCentersForPtApply",
      },
      tags: ["api", "member", "pt", "centers"],
    });

    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
