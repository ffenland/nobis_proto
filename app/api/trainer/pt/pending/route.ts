// app/api/trainer/pt/pending/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getPendingPtsService } from "@/app/lib/services/trainer.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"));
    }
    if (session.role !== "TRAINER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const pendingPts = await getPendingPtsService(session.roleId);
    return NextResponse.json(pendingPts);
  } catch (error) {
    console.error("승인 대기 PT 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
