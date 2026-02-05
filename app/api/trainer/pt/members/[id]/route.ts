import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getMemberDetailsForPtCreation } from "@/app/services/trainer/pt.service";
import { logApiError } from "@/app/services/error/error-logging.service";

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  // 세션 처리를 먼저 수행
  const session = await getSessionOrReturn401();

  if (session instanceof NextResponse) {
    return session;
  }

  if (session.role !== "TRAINER") {
    return NextResponse.json(
      { error: "트레이너만 접근할 수 있습니다." },
      { status: 403 }
    );
  }

  const params = await segmentData.params;
  const { id } = params;

  try {
    const memberDetails = await getMemberDetailsForPtCreation(id);
    return NextResponse.json(memberDetails);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_TRAINER_PT_MEMBER_DETAILS_001",
      userId: session.id,
      metadata: {
        action: "getMemberDetailsForPtCreation",
      },
      tags: ["api", "trainer", "pt", "member"],
    });

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "회원 상세 정보를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}