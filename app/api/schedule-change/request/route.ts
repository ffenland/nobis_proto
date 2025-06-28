// app/api/schedule-change/request/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import {
  createScheduleChangeRequest,
  checkExistingPendingRequest,
} from "@/app/lib/services/pt-schedule-change.service";

// 요청 데이터 타입 정의
interface ICreateRequestBody {
  ptRecordId: string;
  requestedDate: string;
  requestedStartTime: number;
  requestedEndTime: number;
  reason: string;
  forceCancelExisting?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    // 요청 본문 파싱 (타입 지정)
    const body: ICreateRequestBody = await request.json();
    const {
      ptRecordId,
      requestedDate,
      requestedStartTime,
      requestedEndTime,
      reason,
      forceCancelExisting = false,
    } = body;

    // 필수 필드 검증
    if (
      !ptRecordId ||
      !requestedDate ||
      !requestedStartTime ||
      !requestedEndTime ||
      !reason
    ) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    try {
      // 기존 요청 체크 (강제 취소가 아닌 경우)
      if (!forceCancelExisting) {
        const existingCheck = await checkExistingPendingRequest(ptRecordId);
        if (existingCheck.hasExisting) {
          return NextResponse.json(
            {
              error: "EXISTING_REQUEST_FOUND",
              message: "이미 처리 대기 중인 요청이 있습니다.",
            },
            { status: 409 }
          );
        }
      }

      // 새 요청 생성
      const requestId = await createScheduleChangeRequest({
        ptRecordId,
        requestorId: session.id,
        requestedDate,
        requestedStartTime,
        requestedEndTime,
        reason,
        forceCancelExisting,
      });

      return NextResponse.json({
        success: true,
        requestId,
        message: "일정 변경 요청이 생성되었습니다.",
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "EXISTING_REQUEST_FOUND") {
          return NextResponse.json(
            {
              error: "EXISTING_REQUEST_FOUND",
              message: "이미 처리 대기 중인 요청이 있습니다.",
            },
            { status: 409 }
          );
        }

        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      throw error;
    }
  } catch (error) {
    console.error("일정 변경 요청 생성 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
