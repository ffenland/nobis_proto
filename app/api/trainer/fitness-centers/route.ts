// app/api/trainer/fitness-centers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getFitnessCentersService } from "@/app/lib/services/pt-record.service";

export async function GET(request: NextRequest) {
  try {
    const centers = await getFitnessCentersService();
    return NextResponse.json(centers);
  } catch (error) {
    console.error("피트니스 센터 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
