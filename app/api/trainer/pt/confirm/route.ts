import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextResponse } from "next/server";
import { confirmPt, ConfirmPtInput } from "@/app/services/trainer/pt.service";

// PT 확정 처리 (PENDING → CONFIRMED + 첫 레슨 생성)
export const POST = async (request: Request) => {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  try {
    const session = sessionOrResponse;
    const body = await request.json();

    const {
      ptId,
      startDate,
      firstLessonScheduledAt,
      firstLessonEndAt,
      firstLessonMemo,
      contractImageId,
    } = body;

    // 필수 필드 검증
    if (!ptId || !startDate || !firstLessonScheduledAt || !firstLessonEndAt) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    const confirmData: ConfirmPtInput = {
      ptId,
      startDate: new Date(startDate),
      firstLessonScheduledAt,
      firstLessonEndAt,
      firstLessonMemo,
      contractImageId,
    };

    const result = await confirmPt(session.roleId, confirmData);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error confirming PT:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "PT 확정 처리에 실패했습니다." },
      { status: 500 }
    );
  }
};