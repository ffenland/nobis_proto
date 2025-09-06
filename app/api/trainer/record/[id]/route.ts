import { NextResponse, NextRequest } from 'next/server';
import { getSessionOrReturn401 } from '@/app/lib/session';
import { 
  updateLessonRecord,
  deleteLessonRecord,
  type UpdateLessonRecordInput 
} from '@/app/services/trainer/lesson.service';

// Next.js 15 dynamic route params type
type Params = Promise<{ id: string }>

// PUT - 운동 기록 수정
export async function PUT(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const params = await segmentData.params;
    const { id: recordId } = params;
    
    const sessionOrResponse = await getSessionOrReturn401();
    
    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }
    
    // 요청 본문 파싱
    const body: UpdateLessonRecordInput = await request.json();
    
    // 정상 세션인 경우 서비스 함수 호출
    const result = await updateLessonRecord(
      sessionOrResponse.id,
      recordId,
      body
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Lesson record update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE - 운동 기록 삭제
export async function DELETE(
  _request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const params = await segmentData.params;
    const { id: recordId } = params;
    
    const sessionOrResponse = await getSessionOrReturn401();
    
    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }
    
    // 정상 세션인 경우 서비스 함수 호출
    const result = await deleteLessonRecord(
      sessionOrResponse.id,
      recordId
    );
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Lesson record deletion error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}