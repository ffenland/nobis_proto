import { NextResponse, NextRequest } from 'next/server';
import { getSessionOrReturn401 } from '@/app/lib/session';
import { 
  getLessonDetail,
  updateLessonMemo
} from '@/app/services/trainer/lesson.service';

// Next.js 15 dynamic route params type
type Params = Promise<{ id: string }>

// API route는 순수하게 라우팅작업만 담당한다
export async function GET(
  _request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const params = await segmentData.params;
    const { id } = params;
    
    const sessionOrResponse = await getSessionOrReturn401();
    
    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }
    
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
    console.error('Lesson detail fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


// PATCH - 레슨 메모 업데이트
export async function PATCH(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const params = await segmentData.params;
    const { id } = params;
    
    const sessionOrResponse = await getSessionOrReturn401();
    
    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }
    
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
    console.error('Lesson memo update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}