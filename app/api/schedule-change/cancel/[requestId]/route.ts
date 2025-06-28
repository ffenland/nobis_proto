// app/api/schedule-change/cancel/[requestId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { cancelScheduleChangeRequest } from "@/app/lib/services/pt-schedule-change.service";

export async function POST(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { requestId } = params;

    if (!requestId) {
      return NextResponse.json(
        { error: "요청 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 서비스 함수 호출
    await cancelScheduleChangeRequest(requestId, session.id);

    return NextResponse.json({
      success: true,
      message: "일정 변경 요청이 취소되었습니다.",
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("일정 변경 요청 취소 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
