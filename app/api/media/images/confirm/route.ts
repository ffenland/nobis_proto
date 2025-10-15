// app/api/media/images/confirm/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { logApiError } from "@/app/services/error/error-logging.service";
import {
  confirmImageUpload,
  type ImageConfirmRequest,
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
    const body: ImageConfirmRequest = await request.json();
    const { cloudflareId, entityType, entityId, isPrimary } = body;

    // 서비스 로직 호출
    const result = await confirmImageUpload(
      cloudflareId,
      entityType,
      entityId || null,
      sessionOrResponse,
      isPrimary
    );

    return NextResponse.json(result);
  } catch (error) {
    // 3. 에러 로깅 (필수)
    await logApiError(request, error as Error, {
      errorCode: "MEDIA_IMAGE_CONFIRM_001",
      userId: sessionOrResponse.id,
      metadata: { action: "confirmImageUpload" },
      tags: ["media", "image", "confirm"],
    });

    // 에러 메시지에 따른 HTTP 상태 코드 결정
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("Image not found in Cloudflare")) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    if (
      errorMessage.includes("Unauthorized") ||
      errorMessage.includes("different user")
    ) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    if (errorMessage.includes("Only") && errorMessage.includes("can upload")) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Failed to confirm image upload" },
      { status: 500 }
    );
  }
}
