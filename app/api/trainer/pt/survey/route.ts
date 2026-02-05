import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextRequest, NextResponse } from "next/server";
import {
  getSurveyQuestions,
  submitSurveyResponse,
} from "@/app/services/trainer/pt.service";
import { logApiError } from "@/app/services/error/error-logging.service";

// 설문지 조회
export const GET = async (request: NextRequest) => {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  try {
    const survey = await getSurveyQuestions();

    if (!survey) {
      return NextResponse.json(
        { error: "활성 설문지가 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(survey);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_TRAINER_PT_SURVEY_GET_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getSurveyQuestions",
      },
      tags: ["api", "trainer", "pt", "survey"],
    });

    return NextResponse.json(
      { error: "설문지를 불러올 수 없습니다." },
      { status: 500 }
    );
  }
};

// 설문 응답 제출
export const POST = async (request: NextRequest) => {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  try {
    const body = await request.json();

    const { memberId, surveyId, responses, signatureImageId } = body;

    if (!memberId || !surveyId || !responses || !Array.isArray(responses)) {
      return NextResponse.json(
        { error: "필수 데이터가 누락되었습니다." },
        { status: 400 }
      );
    }

    const result = await submitSurveyResponse(
      sessionOrResponse.roleId,
      memberId,
      surveyId,
      responses,
      signatureImageId
    );

    return NextResponse.json(result);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_TRAINER_PT_SURVEY_POST_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "submitSurveyResponse",
      },
      tags: ["api", "trainer", "pt", "survey"],
    });

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "설문 응답 제출 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
};