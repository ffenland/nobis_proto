import { NextResponse, NextRequest } from 'next/server';
import { getSessionOrReturn401 } from '@/app/lib/session';
import {
  addLessonRecordItem,
  updateLessonRecordItem,
  deleteLessonRecordItem,
  getLessonDetailRecords,
  type CreateRecordInput,
  type UpdateRecordInput
} from '@/app/services/trainer/lesson.service';

// Next.js 15 dynamic route params type
type Params = Promise<{ id: string }>

// GET - 레슨의 레코드 목록 조회
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
    
    // 서비스 함수 호출
    const records = await getLessonDetailRecords({
      lessonId,
      trainerId: sessionOrResponse.roleId
    });
    
    if (!records) {
      return NextResponse.json({ 
        error: 'Lesson not found or unauthorized' 
      }, { status: 404 });
    }
    
    return NextResponse.json(records);
  } catch (error) {
    console.error('Get lesson records error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal Server Error' 
    }, { status: 500 });
  }
}

// POST - 개별 운동 기록 추가
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
    
    // 요청 본문 파싱
    const record: CreateRecordInput = await request.json();
    
    // 서비스 함수 호출
    const result = await addLessonRecordItem(
      sessionOrResponse.roleId,
      lessonId,
      record
    );
    
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Lesson record item creation error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal Server Error' 
    }, { status: 500 });
  }
}

// PUT - 개별 운동 기록 수정
export async function PUT(
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
    
    // 요청 본문 파싱
    const { recordId, ...updateData }: UpdateRecordInput & { recordId: string } = await request.json();
    
    // 서비스 함수 호출
    const result = await updateLessonRecordItem(
      sessionOrResponse.roleId,
      recordId,
      updateData
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Lesson record item update error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal Server Error' 
    }, { status: 500 });
  }
}

// DELETE - 개별 운동 기록 삭제
export async function DELETE(
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
    
    // 요청 본문 파싱
    const { recordId } = await request.json();
    
    if (!recordId) {
      return NextResponse.json({ 
        error: 'recordId is required' 
      }, { status: 400 });
    }
    
    // 서비스 함수 호출
    const result = await deleteLessonRecordItem(
      recordId,
      lessonId,
      sessionOrResponse.roleId
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Lesson record item deletion error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal Server Error' 
    }, { status: 500 });
  }
}