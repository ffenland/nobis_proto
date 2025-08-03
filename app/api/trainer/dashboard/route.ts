// app/api/trainer/dashboard-stats/route.ts
import { NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import { getTrainerDashboardStatsService } from "@/app/lib/services/trainer.service";

export async function GET() {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "TRAINER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const stats = await getTrainerDashboardStatsService(session.roleId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("트레이너 대시보드 통계 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
