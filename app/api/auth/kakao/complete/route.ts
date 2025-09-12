import { NextRequest, NextResponse } from 'next/server';
import { processKakaoLogin } from '@/app/services/auth/auth.service';

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
    console.error('Kakao login API error:', error);
    return NextResponse.json(
      { success: false, error: 'server_error' },
      { status: 500 }
    );
  }
}