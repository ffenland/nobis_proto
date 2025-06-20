// app/api/member/pt-application/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import { createPtApplicationService } from "@/app/lib/services/pt-application.service";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "MEMBER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const {
      ptProductId,
      trainerId,
      isRegular,
      startDate,
      schedules,
      weekTimes,
    } = body;

    // 필수 필드 검증
    if (!ptProductId || !trainerId || !startDate || !schedules) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    const result = await createPtApplicationService({
      memberId: session.roleId,
      ptProductId,
      trainerId,
      isRegular: isRegular || false,
      startDate: new Date(startDate),
      schedules: schedules.map((s: any) => ({
        date: new Date(s.date),
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      weekTimes: weekTimes?.map((wt: any) => ({
        weekDay: wt.weekDay,
        startTime: wt.startTime,
        endTime: wt.endTime,
      })),
    });

    return NextResponse.json({ success: true, ptId: result.id });
  } catch (error) {
    console.error("PT Application 생성 실패:", error);
    return NextResponse.json(
      { error: "신청 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
