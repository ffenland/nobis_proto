import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getMemberDashboardStats } from "@/app/lib/services/member/member-dashboard.service";

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session || session.role !== "MEMBER") {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 401 }
      );
    }

    const memberId = session.roleId;
    const stats = await getMemberDashboardStats(memberId);
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Failed to fetch member dashboard stats:", error);
    return NextResponse.json(
      { error: "대시보드 정보를 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}