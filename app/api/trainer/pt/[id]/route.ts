import { NextResponse, NextRequest } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getTrainerPtDetail } from "@/app/services/trainer/pt.service";
import { createLesson } from "@/app/services/trainer/lesson.service";
import { logApiError } from "@/app/services/error/error-logging.service";

// Next.js 15 dynamic route params type
type Params = Promise<{ id: string }>;

// API route는 순수하게 라우팅작업만 담당한다
export async function GET(_: NextRequest, segmentData: { params: Params }) {
  const params = await segmentData.params;
  const { id } = params;

  // 세션 처리를 먼저 수행
  const sessionOrResponse = await getSessionOrReturn401();

  // 401 응답인 경우 바로 반환
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  try {
    // 정상 세션인 경우 서비스 함수 호출
    // session.roleId는 Trainer 모델의 id
    const ptDetail = await getTrainerPtDetail(sessionOrResponse.roleId, id);

    if (!ptDetail) {
      return NextResponse.json({ error: "PT not found" }, { status: 404 });
    }

    return NextResponse.json(ptDetail);
  } catch (error) {
    await logApiError(_, error as Error, {
      errorCode: "API_TRAINER_PT_DETAIL_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getTrainerPtDetail",
      },
      tags: ["api", "trainer", "pt"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST 메소드 - Lesson 생성용
export async function POST(
  request: NextRequest,
  segmentData: { params: Params }
) {
  const params = await segmentData.params;
  const { id } = params;

  // 세션 처리를 먼저 수행
  const sessionOrResponse = await getSessionOrReturn401();

  // 401 응답인 경우 바로 반환
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  try {
    // Request body 파싱
    const body = await request.json();

    // 서비스 함수 호출하여 레슨 생성
    const result = await createLesson(sessionOrResponse.roleId, id, body);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    await logApiError(request, error as Error, {
      errorCode: "API_TRAINER_LESSON_CREATE_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "createLesson",
      },
      tags: ["api", "trainer", "lesson"],
    });

    // 스케줄 충돌 에러 처리
    if (error.message && error.message.includes("일정이 중복됩니다")) {
      return NextResponse.json(
        {
          error: error.message,
          type: "SCHEDULE_CONFLICT",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
