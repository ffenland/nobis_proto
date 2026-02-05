import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { deleteLessonConditionByTemplate } from "@/app/services/trainer/lesson.service";
import { logApiError } from "@/app/services/error/error-logging.service";

type Params = Promise<{ id: string }>;

// 특정 템플릿의 컨디션 기록 삭제
export async function DELETE(
  request: NextRequest,
  segmentData: { params: Params }
) {
  // 세션 처리를 먼저 수행
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  const params = await segmentData.params;
  const { id: lessonId } = params;

  try {
    const body = await request.json();
    const { templateName } = body;

    if (!templateName) {
      return NextResponse.json(
        { error: "템플릿 이름이 필요합니다" },
        { status: 400 }
      );
    }

    const result = await deleteLessonConditionByTemplate(
      lessonId,
      sessionOrResponse.roleId,
      templateName
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_TRAINER_LESSON_CONDITION_TEMPLATE_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "deleteLessonConditionByTemplate",
      },
      tags: ["api", "trainer", "lesson", "condition", "template"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}