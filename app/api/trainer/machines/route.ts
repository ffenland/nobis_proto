// app/api/trainer/machines/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getMachinesService } from "@/app/lib/services/trainer/pt-record.service";

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

    const machines = await getMachinesService(centerId);
    return NextResponse.json(machines);
  } catch (error) {
    console.error("머신 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
