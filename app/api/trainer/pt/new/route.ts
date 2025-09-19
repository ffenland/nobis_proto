import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextResponse } from "next/server";
import {
  createDirectPt,
  CreateDirectPtInput,
  createTrainerPt,
  CreateTrainerPtInput,
} from "@/app/services/trainer/pt.service";

// 트레이너 PT 생성 (간소화된 버전 - ACCEPTING 상태로 생성)
export const POST = async (request: Request) => {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  try {
    const session = sessionOrResponse;
    const body = await request.json();

    // 새로운 간소화된 PT 생성 (ACCEPTING 상태)
    if (body.type === "trainer") {
      const { memberId, ptProductId } = body;

      // 필수 필드 검증
      if (!memberId || !ptProductId) {
        return NextResponse.json(
          { error: "회원과 PT 상품을 선택해주세요." },
          { status: 400 }
        );
      }

      const ptData: CreateTrainerPtInput = {
        memberId,
        ptProductId,
        trainerId: session.roleId,
      };

      const result = await createTrainerPt(ptData);
      return NextResponse.json({ success: true, pt: result });
    }

    // 기존 직접 PT 생성 (하위 호환성을 위해 유지)
    const {
      memberId,
      ptProductId,
      startDate,
      description,
      goals,
      firstLessonScheduledAt,
      firstLessonEndAt,
      firstLessonMemo,
    } = body;

    // 필수 필드 검증
    if (
      !memberId ||
      !ptProductId ||
      !startDate ||
      !description ||
      !goals ||
      !firstLessonScheduledAt ||
      !firstLessonEndAt
    ) {
      return NextResponse.json(
        { error: "필수 데이터가 누락되었습니다." },
        { status: 400 }
      );
    }

    const ptData: CreateDirectPtInput = {
      memberId,
      ptProductId,
      startDate: new Date(startDate),
      description,
      goals,
      firstLessonScheduledAt,
      firstLessonEndAt,
      firstLessonMemo,
    };

    const result = await createDirectPt(session.roleId, ptData);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating PT:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "PT 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
};