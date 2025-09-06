// app/api/member/new-pt/trainers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getTrainersWithPtProgramsByCenter } from "@/app/services/member/pt/pt.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== "MEMBER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const centerId = searchParams.get("center");

    if (!centerId) {
      return NextResponse.json(
        { error: "센터 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const trainers = await getTrainersWithPtProgramsByCenter(centerId);
    return NextResponse.json(trainers);
  } catch (error) {
    console.error("트레이너 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}