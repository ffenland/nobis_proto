// app/api/member/validate-schedule/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { validateScheduleService } from "@/app/lib/services/schedule.service";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (session.role !== "MEMBER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const { trainerId, chosenSchedule, pattern, totalCount } = body;

    // 필수 필드 검증
    if (!trainerId || !chosenSchedule || !pattern) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    const result = await validateScheduleService({
      trainerId,
      chosenSchedule,
      pattern,
      totalCount: totalCount || 0,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Schedule validation 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
