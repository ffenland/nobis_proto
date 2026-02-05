import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import {
  updateLessonRecordSets,
  deleteLessonRecordItem,
} from "@/app/services/trainer/lesson.service";
import { logApiError } from "@/app/services/error/error-logging.service";

type Params = Promise<{ id: string; recordId: string }>;

export async function PUT(
  request: NextRequest,
  segmentData: { params: Params }
) {
  // 세션 처리를 먼저 수행
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  const params = await segmentData.params;
  const { id: lessonId, recordId } = params;

  try {
    const body = await request.json();
    const { sets } = body;

    if (!sets || !Array.isArray(sets)) {
      return NextResponse.json({ error: "Invalid sets data" }, { status: 400 });
    }

    const result = await updateLessonRecordSets(
      recordId,
      lessonId,
      sessionOrResponse.roleId,
      sets
    );

    return NextResponse.json(result);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_TRAINER_LESSON_RECORD_UPDATE_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "updateLessonRecordSets",
      },
      tags: ["api", "trainer", "lesson", "record"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

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
  const { id: lessonId, recordId } = params;

  try {
    const result = await deleteLessonRecordItem(
      recordId,
      lessonId,
      sessionOrResponse.roleId
    );

    return NextResponse.json(result);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_TRAINER_LESSON_RECORD_DELETE_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "deleteLessonRecordItem",
      },
      tags: ["api", "trainer", "lesson", "record"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
