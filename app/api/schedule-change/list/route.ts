// app/api/schedule-change/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getUserScheduleChangeRequests } from "@/app/lib/services/pt-schedule-change.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    // 서비스 함수 호출 (타입 자동 추론)
    const requests = await getUserScheduleChangeRequests(session.id);

    return NextResponse.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("일정 변경 요청 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
