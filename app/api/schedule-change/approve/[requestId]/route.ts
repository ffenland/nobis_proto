// app/api/schedule-change/approve/[requestId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { approveScheduleChangeRequest } from "@/app/lib/services/pt-schedule-change.service";

// 요청 데이터 타입 정의
interface IApproveRequestBody {
  responseMessage?: string;
}

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

    // 요청 본문 파싱 (타입 지정)
    const body: IApproveRequestBody = await request.json();
    const { responseMessage } = body;

    // 서비스 함수 호출
    await approveScheduleChangeRequest({
      requestId,
      responderId: session.id,
      responseMessage: responseMessage || "승인되었습니다.",
    });

    return NextResponse.json({
      success: true,
      message: "일정 변경 요청이 승인되었습니다.",
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("일정 변경 요청 승인 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
