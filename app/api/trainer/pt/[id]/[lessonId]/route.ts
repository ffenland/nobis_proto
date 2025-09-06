import { NextResponse, NextRequest } from 'next/server';
import { getSessionOrReturn401 } from '@/app/lib/session';
import { 
  getTrainerLessonDetail,
  createLessonRecord,
  type CreateLessonRecordInput 
} from '@/app/services/trainer/lesson.service';

// Next.js 15 dynamic route params type
type Params = Promise<{ id: string; lessonId: string }>

// API route는 순수하게 라우팅작업만 담당한다
export async function GET(
  _request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const params = await segmentData.params;
    const { id, lessonId } = params;
    
    const sessionOrResponse = await getSessionOrReturn401();
    
    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }
    
    // 정상 세션인 경우 서비스 함수 호출
    // getTrainerLessonDetail은 trainerId와 lessonId만 필요
    const lessonDetail = await getTrainerLessonDetail(
      sessionOrResponse.id,
      lessonId
    );
    
    return NextResponse.json(lessonDetail);
  } catch (error) {
    console.error('Lesson detail fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST - 새 운동 기록 생성
export async function POST(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const params = await segmentData.params;
    const { id, lessonId } = params;
    
    const sessionOrResponse = await getSessionOrReturn401();
    
    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }
    
    // 요청 본문 파싱
    const body: CreateLessonRecordInput = await request.json();
    
    // 정상 세션인 경우 서비스 함수 호출
    const result = await createLessonRecord(
      sessionOrResponse.id,
      id,
      lessonId,
      body
    );
    
    // 성공 여부에 따른 응답
    if (result.success) {
      return NextResponse.json(result, { status: 201 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Lesson record creation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}