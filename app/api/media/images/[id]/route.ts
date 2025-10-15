// app/api/media/images/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import {
  deleteImage,
  setImagePrimary,
} from "@/app/services/media/media.service";
import { logApiError } from "@/app/services/error/error-logging.service";

type Params = Promise<{ id: string }>;

// 이미지 조회 기능은 현재 사용되지 않으므로 GET 엔드포인트 제거
// 필요시 새로운 서비스에 조회 기능 추가 가능

// PATCH /api/media/images/[id] - 대표 이미지 설정
export async function PATCH(
  request: NextRequest,
  segmentData: { params: Params }
) {
  const params = await segmentData.params;
  const { id: imageId } = params;

  // 1. 세션 확인 (필수)
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 2. 입력 검증
  if (!imageId) {
    return NextResponse.json(
      {
        error: "이미지 ID가 필요합니다.",
      },
      { status: 400 }
    );
  }

  // 3. 비즈니스 로직 (try-catch 내부)
  try {
    const updatedImage = await setImagePrimary(imageId, sessionOrResponse);
    return NextResponse.json(updatedImage);
  } catch (error) {
    // 이미지를 찾을 수 없는 경우
    if (error instanceof Error && error.message === "Image not found") {
      await logApiError(request, error, {
        errorCode: "API_IMAGE_001_NOT_FOUND",
        userId: sessionOrResponse.id,
        metadata: {
          action: "setImagePrimary",
          imageId,
          errorType: "not_found",
        },
        tags: ["api", "image", "patch", "not-found"],
      });

      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 404 }
      );
    }

    // 권한 오류
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      await logApiError(request, error, {
        errorCode: "API_IMAGE_001_UNAUTHORIZED",
        userId: sessionOrResponse.id,
        metadata: {
          action: "setImagePrimary",
          imageId,
          errorType: "unauthorized",
        },
        tags: ["api", "image", "patch", "unauthorized"],
      });

      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 403 }
      );
    }

    // entityId 관련 오류
    if (
      error instanceof Error &&
      (error.message.includes("no entity relationship") ||
        error.message.includes("no entity ID"))
    ) {
      await logApiError(request, error, {
        errorCode: "API_IMAGE_001_INVALID_TYPE",
        userId: sessionOrResponse.id,
        metadata: {
          action: "setImagePrimary",
          imageId,
          errorType: "invalid_entity_type",
        },
        tags: ["api", "image", "patch", "validation"],
      });

      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 400 }
      );
    }

    // 기타 서버 오류
    await logApiError(request, error as Error, {
      errorCode: "API_IMAGE_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "setImagePrimary",
        imageId,
        errorType: "internal_error",
      },
      tags: ["api", "image", "patch", "error"],
    });

    return NextResponse.json(
      {
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/media/images/[id] - 이미지 삭제
export async function DELETE(
  request: NextRequest,
  segmentData: { params: Params }
) {
  const params = await segmentData.params;
  const { id: imageId } = params;

  // 1. 세션 확인 (필수)
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 2. 입력 검증
  if (!imageId) {
    return NextResponse.json(
      {
        error: "이미지 ID가 필요합니다.",
      },
      { status: 400 }
    );
  }

  // 3. 비즈니스 로직 (try-catch 내부)
  try {
    const result = await deleteImage(imageId, sessionOrResponse);
    return NextResponse.json(result);
  } catch (error) {
    // 이미지를 찾을 수 없는 경우
    if (error instanceof Error && error.message === "Image not found") {
      await logApiError(request, error, {
        errorCode: "API_IMAGE_002_NOT_FOUND",
        userId: sessionOrResponse.id,
        metadata: {
          action: "deleteImage",
          imageId,
          errorType: "not_found",
        },
        tags: ["api", "image", "delete", "not-found"],
      });

      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 404 }
      );
    }

    // 권한 오류
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      await logApiError(request, error, {
        errorCode: "API_IMAGE_002_UNAUTHORIZED",
        userId: sessionOrResponse.id,
        metadata: {
          action: "deleteImage",
          imageId,
          errorType: "unauthorized",
        },
        tags: ["api", "image", "delete", "unauthorized"],
      });

      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 403 }
      );
    }

    // 기타 서버 오류
    await logApiError(request, error as Error, {
      errorCode: "API_IMAGE_002",
      userId: sessionOrResponse.id,
      metadata: {
        action: "deleteImage",
        imageId,
        errorType: "internal_error",
      },
      tags: ["api", "image", "delete", "error"],
    });

    return NextResponse.json(
      {
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
