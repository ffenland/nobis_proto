// app/api/media/images/upload/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { logApiError } from "@/app/services/error/error-logging.service";
import {
  requestImageUpload,
  RequestImageUploadResult,
  type ImageUploadRequest,
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
    const body: ImageUploadRequest = await request.json();
    const { entityType, entityId, metadata } = body;

    // 서비스 로직 호출
    const result: RequestImageUploadResult = await requestImageUpload(
      entityType,
      entityId || null,
      sessionOrResponse,
      metadata
    );

    return NextResponse.json(result);
  } catch (error) {
    // 3. 에러 로깅 (필수)
    await logApiError(request, error as Error, {
      errorCode: "MEDIA_IMAGE_UPLOAD_001",
      userId: sessionOrResponse.id,
      metadata: { action: "requestImageUpload" },
      tags: ["media", "image", "upload"],
    });

    // 에러 메시지에 따른 HTTP 상태 코드 결정
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // 권한 에러 (validateImageUploadPermission에서 발생)
    if (errorMessage.includes("Only") && errorMessage.includes("can upload")) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    // Cloudflare API 에러
    if (errorMessage.includes("Cloudflare Images API error")) {
      return NextResponse.json({ error: errorMessage }, { status: 502 });
    }

    // 일반적인 권한 에러
    if (
      errorMessage.includes("Unauthorized") ||
      errorMessage.includes("Forbidden")
    ) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Failed to create upload URL" },
      { status: 500 }
    );
  }
}
