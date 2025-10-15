import { NextRequest, NextResponse } from "next/server";
import { getTrainerClosedPtList } from "@/app/services/trainer/pt.service";
import { logApiError } from "@/app/services/error/error-logging.service";
import { getSessionOrReturn401 } from "@/app/lib/session";

export async function GET(request: NextRequest) {
  // 세션 확인
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // TRAINER 권한 확인
  if (sessionOrResponse.role !== "TRAINER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // URL 쿼리 파라미터에서 yMonth 추출
    const searchParams = request.nextUrl.searchParams;
    const yMonthParam = searchParams.get("yMonth");

    // 현재 날짜를 기본값으로 사용
    const now = new Date();
    const yMonth = yMonthParam || `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

    const closedPts = await getTrainerClosedPtList(
      sessionOrResponse.roleId,
      yMonth
    );

    return NextResponse.json(closedPts);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "PT_CLOSED_GET_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getClosedPts",
      },
      tags: ["api", "pt", "closed", "trainer"],
    });

    return NextResponse.json(
      { error: "Failed to fetch closed PT list" },
      { status: 500 }
    );
  }
}
