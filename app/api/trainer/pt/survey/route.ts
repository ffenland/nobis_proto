import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextResponse } from "next/server";
import {
  getSurveyQuestions,
  submitSurveyResponse,
} from "@/app/services/trainer/pt.service";

// 설문지 조회
export const GET = async () => {
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
    console.error("Error fetching survey:", error);
    return NextResponse.json(
      { error: "설문지를 불러올 수 없습니다." },
      { status: 500 }
    );
  }
};

// 설문 응답 제출
export const POST = async (request: Request) => {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  try {
    const session = sessionOrResponse;
    const body = await request.json();
    
    const { memberId, surveyId, responses, signatureImageId } = body;

    if (!memberId || !surveyId || !responses || !Array.isArray(responses)) {
      return NextResponse.json(
        { error: "필수 데이터가 누락되었습니다." },
        { status: 400 }
      );
    }

    const result = await submitSurveyResponse(
      session.roleId,
      memberId,
      surveyId,
      responses,
      signatureImageId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error submitting survey response:", error);
    
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