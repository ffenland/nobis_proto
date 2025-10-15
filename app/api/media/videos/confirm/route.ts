// app/api/media/videos/confirm/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { logApiError } from "@/app/services/error/error-logging.service";
import {
  confirmVideoUpload,
  type VideoConfirmRequest,
} from "@/app/services/media/media.service";

export async function POST(request: NextRequest) {
  // 1. 세션 확인 (필수)
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 2. 비즈니스 로직 (try-catch 내부)
  try {
    // 요청 파싱
    const body: VideoConfirmRequest = await request.json();
    const { streamId, entityType, entityId } = body;

    // 서비스 로직 호출
    const result = await confirmVideoUpload(
      streamId,
      entityType,
      entityId || null,
      sessionOrResponse
    );

    return NextResponse.json(result);
  } catch (error) {
    // 3. 에러 로깅 (필수)
    await logApiError(request, error as Error, {
      errorCode: "MEDIA_VIDEO_CONFIRM_001",
      userId: sessionOrResponse.id,
      metadata: { action: "confirmVideoUpload" },
      tags: ["media", "video", "confirm"],
    });

    // 에러 메시지에 따른 HTTP 상태 코드 결정
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("Video not found in Cloudflare")) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    if (errorMessage.includes("Unauthorized") || errorMessage.includes("different user")) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    if (errorMessage.includes("Only trainers can upload")) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Failed to confirm video upload" },
      { status: 500 }
    );
  }
}
