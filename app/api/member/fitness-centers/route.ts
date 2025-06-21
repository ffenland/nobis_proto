// app/api/member/fitness-centers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import { getFitnessCentersService } from "@/app/lib/services/pt-apply.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "MEMBER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const centers = await getFitnessCentersService();
    return NextResponse.json(centers);
  } catch (error) {
    console.error("Fitness Centers 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
