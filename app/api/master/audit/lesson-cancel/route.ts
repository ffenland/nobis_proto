import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import {
  getCanceledLessons,
  approveLessonCancel,
} from "@/app/services/master/audit.service";
import { logApiError } from "@/app/services/error/error-logging.service";

export async function GET(request: NextRequest) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json(
      { error: "마스터 권한이 필요합니다." },
      { status: 403 }
    );
  }

  try {
    const result = await getCanceledLessons(sessionOrResponse.roleId);

    return NextResponse.json(result);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_LESSON_CANCEL_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getCanceledLessons",
      },
      tags: ["api", "lesson-cancel", "master"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json(
      { error: "Master 권한이 필요합니다." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { lessonId } = body;

    if (!lessonId || typeof lessonId !== "string") {
      return NextResponse.json(
        { error: "lessonId가 필요합니다." },
        { status: 400 }
      );
    }

    const result = await approveLessonCancel(
      sessionOrResponse.roleId,
      lessonId
    );

    return NextResponse.json(result);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_LESSON_CANCEL_APPROVE_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "approveLessonCancel",
      },
      tags: ["api", "master", "lesson-cancel", "approve"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
