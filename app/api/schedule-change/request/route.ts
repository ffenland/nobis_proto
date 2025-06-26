// app/api/schedule-change/request/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import {
  createMemberScheduleChangeRequest,
  createTrainerScheduleChangeRequest,
  cancelExistingAndCreateNewRequest,
  type IScheduleChangeRequest,
} from "@/app/lib/services/pt-schedule-change.service";

interface RequestBody {
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

    const body: RequestBody = await request.json();
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

    // 타입 검증
    if (
      typeof ptRecordId !== "string" ||
      typeof requestedDate !== "string" ||
      typeof requestedStartTime !== "number" ||
      typeof requestedEndTime !== "number" ||
      typeof reason !== "string"
    ) {
      return NextResponse.json(
        { error: "잘못된 데이터 형식입니다." },
        { status: 400 }
      );
    }

    // 날짜 유효성 검증
    const parsedDate = new Date(requestedDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: "유효하지 않은 날짜입니다." },
        { status: 400 }
      );
    }

    // 시간 유효성 검증
    if (
      requestedStartTime < 600 ||
      requestedStartTime > 2200 ||
      requestedEndTime < 600 ||
      requestedEndTime > 2200 ||
      requestedStartTime >= requestedEndTime
    ) {
      return NextResponse.json(
        { error: "유효하지 않은 시간입니다." },
        { status: 400 }
      );
    }

    const requestParams: IScheduleChangeRequest = {
      ptRecordId,
      requestorId: session.id,
      requestedDate: parsedDate,
      requestedStartTime,
      requestedEndTime,
      reason,
    };

    let requestId: string;

    try {
      if (forceCancelExisting) {
        // 기존 요청 취소 후 새 요청 생성
        requestId = await cancelExistingAndCreateNewRequest(requestParams);
      } else {
        // 일반적인 요청 생성 (Member/Trainer 구분)
        if (session.role === "MEMBER") {
          requestId = await createMemberScheduleChangeRequest(requestParams);
        } else if (session.role === "TRAINER") {
          requestId = await createTrainerScheduleChangeRequest(requestParams);
        } else {
          return NextResponse.json(
            { error: "회원 또는 트레이너만 요청할 수 있습니다." },
            { status: 403 }
          );
        }
      }

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
