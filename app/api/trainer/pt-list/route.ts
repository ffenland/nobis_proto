// app/api/trainer/pt-list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import { getTrainerPtListService } from "@/app/lib/services/trainer.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "TRAINER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const ptList = await getTrainerPtListService(session.roleId);
    return NextResponse.json(ptList);
  } catch (error) {
    console.error("트레이너 PT 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
