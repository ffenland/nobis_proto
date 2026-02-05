import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import {
  createLessonCondition,
  getLessonCondition,
  deleteLessonCondition,
  type CreateLessonConditionInput,
} from "@/app/services/trainer/lesson.service";
import { logApiError } from "@/app/services/error/error-logging.service";

type Params = Promise<{ id: string }>;

// 컨디션 기록 조회
export async function GET(
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
    const condition = await getLessonCondition(lessonId, sessionOrResponse.roleId);
    
    if (!condition) {
      return NextResponse.json(
        { error: "레슨을 찾을 수 없거나 권한이 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(condition);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_TRAINER_LESSON_CONDITION_GET_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getLessonCondition",
      },
      tags: ["api", "trainer", "lesson", "condition"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// 컨디션 기록 생성
export async function POST(
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
    const body: CreateLessonConditionInput = await request.json();

    const result = await createLessonCondition(
      lessonId,
      sessionOrResponse.roleId,
      body
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
      errorCode: "API_TRAINER_LESSON_CONDITION_POST_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "createLessonCondition",
      },
      tags: ["api", "trainer", "lesson", "condition"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// 컨디션 기록 삭제
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
    const result = await deleteLessonCondition(
      lessonId,
      sessionOrResponse.roleId
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
      errorCode: "API_TRAINER_LESSON_CONDITION_DELETE_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "deleteLessonCondition",
      },
      tags: ["api", "trainer", "lesson", "condition"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}