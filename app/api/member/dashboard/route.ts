// app/api/member/dashboard/route.ts (PtState 적용 업데이트)
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import { getMemberDashboardStatsService } from "@/app/lib/services/member.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "MEMBER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const stats = await getMemberDashboardStatsService(session.roleId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("회원 대시보드 통계 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
