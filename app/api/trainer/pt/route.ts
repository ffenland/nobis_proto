import { NextResponse } from 'next/server';
import { getSessionOrReturn401 } from '@/app/lib/session';
import { getTrainerPtList } from '@/app/services/trainer/pt.service';

// API route는 순수하게 라우팅작업만 담당한다
export async function GET() {
  try {
    const sessionOrResponse = await getSessionOrReturn401();
    
    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }
    
    // 정상 세션인 경우 서비스 함수 호출
    // session.roleId는 Trainer 모델의 id
    const ptList = await getTrainerPtList(sessionOrResponse.roleId);
    
    return NextResponse.json(ptList);
  } catch (error) {
    console.error('PT list fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}