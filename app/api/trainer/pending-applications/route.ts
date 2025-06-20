// app/api/trainer/pending-applications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import { getPendingPtApplicationsService } from "@/app/lib/services/trainer.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "TRAINER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const pendingApplications = await getPendingPtApplicationsService(
      session.roleId
    );
    return NextResponse.json(pendingApplications);
  } catch (error) {
    console.error("승인 대기 PT 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
