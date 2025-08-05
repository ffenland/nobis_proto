import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { createDirectRegistration } from "@/app/lib/services/manager/direct-registration.service";
import { ErrorReporter } from "@/app/lib/utils/error-reporter";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.id || session.role !== "MANAGER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    
    const body = await request.json();
    
    // 날짜 문자열을 Date 객체로 변환
    const selectedDates = body.selectedDates.map((dateStr: string) => new Date(dateStr));
    
    // 스케줄 데이터 변환
    const schedules = body.schedules.map((schedule: any) => ({
      date: new Date(schedule.date),
      startTime: schedule.startTime,
      endTime: schedule.endTime
    }));
    
    const result = await createDirectRegistration({
      ...body,
      selectedDates,
      schedules
    });
    
    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    await ErrorReporter.report(error, {
      action: "create-direct-registration",
      metadata: {
        description: "기존 수업 등록 처리 중 오류",
      },
    });
    
    const errorMessage = error instanceof Error ? error.message : "등록 처리 중 오류가 발생했습니다.";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}