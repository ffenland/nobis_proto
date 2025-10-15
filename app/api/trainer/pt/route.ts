import { NextRequest, NextResponse } from 'next/server';
import { getSessionOrReturn401 } from '@/app/lib/session';
import { getTrainerPtList } from '@/app/services/trainer/pt.service';
import { logApiError } from '@/app/services/error/error-logging.service';

export async function GET(request: NextRequest) {
  // 1. 세션 확인
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 3. 비즈니스 로직
  try {
    // session.roleId는 Trainer 모델의 id
    const ptList = await getTrainerPtList(sessionOrResponse.roleId);
    return NextResponse.json(ptList);
  } catch (error) {
    // 4. 에러 로깅
    await logApiError(request, error as Error, {
      errorCode: 'TRAINER_001',
      userId: sessionOrResponse.id,
      metadata: {
        action: 'getTrainerPtList',
      },
      tags: ['trainer', 'pt'],
    });

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}