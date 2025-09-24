import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import {
  checkLessonCancellable,
  cancelLesson,
} from "@/app/services/trainer/lesson.service";

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const params = await segmentData.params;
    const { id: lessonId } = params;

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

    // 레슨 취소 가능 여부 체크
    const cancellableResult = await checkLessonCancellable(
      sessionOrResponse.roleId,
      lessonId
    );

    return NextResponse.json(cancellableResult);
  } catch (error) {
    console.error("Get lesson cancel info API error:", error);
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
  try {
    const params = await segmentData.params;
    const { id: lessonId } = params;

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

    // 요청 본문 파싱
    const body = await request.json();
    const { reason } = body;

    // 취소 사유 필수 검증
    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json(
        { error: "취소 사유는 필수입니다." },
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
      reason.trim()
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Cancel lesson API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}