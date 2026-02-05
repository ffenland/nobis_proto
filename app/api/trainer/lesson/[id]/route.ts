import { NextResponse, NextRequest } from 'next/server';
import { getSessionOrReturn401 } from '@/app/lib/session';
import {
  getLessonDetail,
  updateLessonMemo
} from '@/app/services/trainer/lesson.service';
import { logApiError } from '@/app/services/error/error-logging.service';

// Next.js 15 dynamic route params type
type Params = Promise<{ id: string }>

// API route는 순수하게 라우팅작업만 담당한다
export async function GET(
  _request: NextRequest,
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
    // 정상 세션인 경우 서비스 함수 호출
    // roleId를 trainerId로 사용
    const lessonDetail = await getLessonDetail({
      trainerId: sessionOrResponse.roleId,
      lessonId: id
    });
    
    // 레슨이 존재하지 않거나 권한이 없는 경우
    if (!lessonDetail) {
      return NextResponse.json(
        { error: 'Lesson not found or access denied' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(lessonDetail);
  } catch (error) {
    await logApiError(_request, error as Error, {
      errorCode: "API_TRAINER_LESSON_DETAIL_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getLessonDetail",
      },
      tags: ["api", "trainer", "lesson"],
    });

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


// PATCH - 레슨 메모 업데이트
export async function PATCH(
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
    // 요청 본문 파싱
    const { memo } = await request.json();
    
    // 레슨 메모 업데이트 서비스 함수 호출
    const result = await updateLessonMemo(
      sessionOrResponse.roleId,
      id,
      memo
    );
    
    return NextResponse.json(result);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_TRAINER_LESSON_MEMO_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "updateLessonMemo",
      },
      tags: ["api", "trainer", "lesson", "memo"],
    });

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}