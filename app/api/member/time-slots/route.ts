// app/api/member/time-slots/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import {
  generateTimeSlots,
  calculateTimeLength,
} from "@/app/lib/services/schedule.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "MEMBER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const openTime = parseInt(searchParams.get("openTime") || "600");
    const closeTime = parseInt(searchParams.get("closeTime") || "2200");
    const duration = parseFloat(searchParams.get("duration") || "1");
    const startTime = parseInt(searchParams.get("startTime") || "0");

    if (startTime && duration) {
      // 특정 시작 시간의 duration 계산
      const timeLength = calculateTimeLength(
        startTime,
        duration,
        openTime,
        closeTime
      );
      return NextResponse.json({ timeLength });
    } else {
      // 모든 시간 슬롯 반환
      const timeSlots = generateTimeSlots(openTime, closeTime);
      return NextResponse.json({ timeSlots });
    }
  } catch (error) {
    console.error("Time slots 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
