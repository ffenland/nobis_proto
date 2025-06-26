// app/api/schedule-change/check-existing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { checkExistingPendingRequest } from "@/app/lib/services/pt-schedule-change.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const ptRecordId = searchParams.get("ptRecordId");

    if (!ptRecordId) {
      return NextResponse.json(
        { error: "PT 기록 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const result = await checkExistingPendingRequest(ptRecordId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("기존 요청 체크 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
