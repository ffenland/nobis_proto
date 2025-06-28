// app/api/schedule-change/detail/[requestId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getScheduleChangeRequestDetail } from "@/app/lib/services/pt-schedule-change.service";

export async function GET(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { requestId } = params;

    if (!requestId) {
      return NextResponse.json(
        { error: "요청 ID가 필요합니다." },
        { status: 400 }
      );
    }

    // 서비스 함수 호출 (타입 자동 추론)
    const requestDetail = await getScheduleChangeRequestDetail(
      requestId,
      session.id
    );

    if (!requestDetail) {
      return NextResponse.json(
        { error: "요청을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      request: {
        ...requestDetail,
        // Date 객체를 ISO 문자열로 변환
        createdAt: requestDetail.createdAt.toISOString(),
        respondedAt: requestDetail.respondedAt?.toISOString(),
        expiresAt: requestDetail.expiresAt.toISOString(),
        originalSchedule: {
          ...requestDetail.originalSchedule,
          date: requestDetail.originalSchedule.date.toISOString(),
        },
        currentSchedule: {
          ...requestDetail.currentSchedule,
          date: requestDetail.currentSchedule.date.toISOString(),
        },
        requestedSchedule: {
          ...requestDetail.requestedSchedule,
          date: requestDetail.requestedSchedule.date.toISOString(),
        },
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("일정 변경 요청 상세 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
