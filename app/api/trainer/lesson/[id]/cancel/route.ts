import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import {
  checkLessonCancellable,
  cancelLesson,
} from "@/app/services/trainer/lesson.service";
import { logApiError } from "@/app/services/error/error-logging.service";

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  const params = await segmentData.params;
  const { id: lessonId } = params;

  // 세션 처리를 먼저 수행
  const sessionOrResponse = await getSessionOrReturn401();

  // 401 응답인 경우 바로 반환
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 트레이너 권한 확인
  if (sessionOrResponse.role !== "TRAINER") {
    return NextResponse.json(
      { error: "트레이너 권한이 필요합니다." },
      { status: 403 }
    );
  }

  try {
    // 레슨 취소 가능 여부 체크
    const cancellableResult = await checkLessonCancellable(
      sessionOrResponse.roleId,
      lessonId
    );

    return NextResponse.json(cancellableResult);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_TRAINER_LESSON_CANCEL_GET_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "checkLessonCancellable",
      },
      tags: ["api", "trainer", "lesson", "cancel"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  segmentData: { params: Params }
) {
  const params = await segmentData.params;
  const { id: lessonId } = params;

  // 세션 처리를 먼저 수행
  const sessionOrResponse = await getSessionOrReturn401();

  // 401 응답인 경우 바로 반환
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 트레이너 권한 확인
  if (sessionOrResponse.role !== "TRAINER") {
    return NextResponse.json(
      { error: "트레이너 권한이 필요합니다." },
      { status: 403 }
    );
  }

  try {
    // 요청 본문 파싱
    const body = await request.json();
    const { reason, canceledBy } = body;

    // 취소 사유 필수 검증
    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json(
        { error: "취소 사유는 필수입니다." },
        { status: 400 }
      );
    }

    // canceledBy 필수 검증 및 유효성 체크
    if (!canceledBy || typeof canceledBy !== "string") {
      return NextResponse.json(
        { error: "취소 역할을 선택해주세요." },
        { status: 400 }
      );
    }

    // TRAINER 또는 MEMBER만 허용 (MANAGER 제외)
    if (canceledBy !== "TRAINER" && canceledBy !== "MEMBER") {
      return NextResponse.json(
        { error: "유효하지 않은 취소 역할입니다. TRAINER 또는 MEMBER만 가능합니다." },
        { status: 400 }
      );
    }

    // 레슨 취소 가능 여부 다시 체크
    const cancellableResult = await checkLessonCancellable(
      sessionOrResponse.roleId,
      lessonId
    );

    if (!cancellableResult.canCancel) {
      return NextResponse.json(
        { error: cancellableResult.reason },
        { status: 400 }
      );
    }

    // 레슨 취소 처리
    const result = await cancelLesson(
      sessionOrResponse.roleId,
      lessonId,
      canceledBy as "TRAINER" | "MEMBER",
      reason.trim()
    );

    return NextResponse.json(result);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_TRAINER_LESSON_CANCEL_POST_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "cancelLesson",
      },
      tags: ["api", "trainer", "lesson", "cancel"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}