// app/api/member/trainer-schedule/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import { getTrainerScheduleService } from "@/app/lib/services/pt-apply.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "MEMBER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const trainerId = searchParams.get("trainerId");
    const targetDateStr = searchParams.get("targetDate");

    if (!trainerId) {
      return NextResponse.json(
        { error: "트레이너 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 목표 날짜 파싱 (없으면 현재 날짜 사용)
    let targetDate = new Date();
    if (targetDateStr) {
      const parsedDate = new Date(targetDateStr);
      if (!isNaN(parsedDate.getTime())) {
        targetDate = parsedDate;
      }
    }

    const trainerSchedule = await getTrainerScheduleService(
      trainerId,
      targetDate
    );
    return NextResponse.json(trainerSchedule);
  } catch (error) {
    console.error("Trainer Schedule 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
