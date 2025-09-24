import { NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getUncheckedCanceledLessonsCount } from "@/app/services/manager/dashboard.service";

export async function GET() {
  try {
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    // 매니저 권한 확인
    if (sessionOrResponse.role !== "MANAGER") {
      return NextResponse.json(
        { error: "매니저 권한이 필요합니다." },
        { status: 403 }
      );
    }

    // 취소되었지만 매니저 확인이 안 된 레슨 수 조회
    const count = await getUncheckedCanceledLessonsCount(sessionOrResponse.roleId);

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Get unchecked canceled lessons count API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}