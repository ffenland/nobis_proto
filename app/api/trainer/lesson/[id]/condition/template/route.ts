import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { deleteLessonConditionByTemplate } from "@/app/services/trainer/lesson.service";

type Params = Promise<{ id: string }>;

// 특정 템플릿의 컨디션 기록 삭제
export async function DELETE(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const sessionOrResponse = await getSessionOrReturn401();

    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    const params = await segmentData.params;
    const { id: lessonId } = params;

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
    console.error("Delete lesson condition by template error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}