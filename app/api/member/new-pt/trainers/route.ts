// app/api/member/new-pt/trainers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getTrainersWithPtProgramsByCenter } from "@/app/services/member/pt/pt.service";
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
    const { searchParams } = new URL(request.url);
    const centerId = searchParams.get("center");

    if (!centerId) {
      return NextResponse.json(
        { error: "센터 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const trainers = await getTrainersWithPtProgramsByCenter(centerId);
    return NextResponse.json(trainers);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_MEMBER_PT_TRAINERS_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getTrainersWithPtProgramsByCenter",
      },
      tags: ["api", "member", "pt", "trainers"],
    });

    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
