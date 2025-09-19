import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getMemberDashboardData } from "@/app/services/member/dashboard.service";

export async function GET() {
  try {
    // 세션 확인
    const session = await getSession();
    if (!session || session.role !== "MEMBER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // 대시보드 데이터 조회
    const dashboardData = await getMemberDashboardData(session.roleId);

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("Member dashboard 조회 실패:", error);
    return NextResponse.json(
      { error: "대시보드 정보를 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}
