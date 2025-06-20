// app/api/member/pt-stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import { getMemberPtStatsService } from "@/app/lib/services/pt-detail.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "MEMBER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const stats = await getMemberPtStatsService(session.roleId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("PT Stats 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
