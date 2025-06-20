// app/api/trainer/weights/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getWeightsListService } from "@/app/lib/services/pt-record.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const centerId = searchParams.get("centerId");

    if (!centerId) {
      return NextResponse.json(
        { error: "centerId가 필요합니다." },
        { status: 400 }
      );
    }

    const weights = await getWeightsListService(centerId);
    return NextResponse.json(weights);
  } catch (error) {
    console.error("도구 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
