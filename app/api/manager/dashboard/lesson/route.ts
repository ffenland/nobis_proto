import { NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getTodayLessons } from "@/app/services/manager/dashboard.service";

export async function GET() {
  try {
    // 세션 확인
    const sessionOrResponse = await getSessionOrReturn401();

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

    // 오늘의 레슨 조회
    const todayLessons = await getTodayLessons(sessionOrResponse.roleId);

    return NextResponse.json(todayLessons);
  } catch (error) {
    console.error("Get today lessons API error:", error);
    return NextResponse.json(
      { error: "오늘의 레슨을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
