import { NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getWeeklyLessonsCount } from "@/app/services/manager/dashboard.service";

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

    // 주간 레슨 갯수 조회
    const weeklyLessonsCount = await getWeeklyLessonsCount(
      sessionOrResponse.roleId
    );

    return NextResponse.json(weeklyLessonsCount);
  } catch (error) {
    console.error("Get weekly lessons count API error:", error);
    return NextResponse.json(
      { error: "주간 레슨 갯수를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
