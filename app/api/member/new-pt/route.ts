import { NextRequest, NextResponse } from "next/server";
import {
  applyForPt,
  type PtApplicationData,
} from "@/app/services/member/pt/pt.service";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { logApiError } from "@/app/services/error/error-logging.service";

export async function POST(request: NextRequest) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  try {
    const body = await request.json();
    const { centerId, ptProductId, trainerId, startDate, description } = body;

    if (!centerId || !ptProductId || !trainerId || !startDate) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    const applicationData: PtApplicationData = {
      centerId,
      ptProductId,
      trainerId,
      startDate: new Date(startDate),
      description: description?.trim() || undefined,
    };

    const result = await applyForPt(sessionOrResponse.roleId, applicationData);

    return NextResponse.json({
      success: true,
      ptId: result.id,
      message: "PT 신청이 완료되었습니다.",
      data: result,
    });
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_MEMBER_NEW_PT_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "applyForPt",
      },
      tags: ["api", "member", "new-pt"],
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "PT 신청 처리 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
