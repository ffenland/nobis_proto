import { NextRequest, NextResponse } from 'next/server';
import { processKakaoLogin } from '@/app/services/auth/auth.service';
import { logApiError } from '@/app/services/error/error-logging.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'nocode' },
        { status: 400 }
      );
    }

    const result = await processKakaoLogin(code);

    if (result.success) {
      return NextResponse.json({
        success: true,
        role: result.role,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'unknown' },
        { status: 400 }
      );
    }
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: 'AUTH_002',
      metadata: {
        action: 'kakaoLogin',
      },
      tags: ['auth', 'kakao', 'oauth'],
    });

    return NextResponse.json(
      { success: false, error: 'server_error' },
      { status: 500 }
    );
  }
}