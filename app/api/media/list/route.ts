// app/api/media/list/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { logApiError } from "@/app/services/error/error-logging.service";
import {
  ImageType,
  type ListImagesByEntityResult,
  type ListVideosByEntityResult,
  VideoType,
  listImagesByEntity,
  listVideosByEntity,
} from "@/app/services/media/media.service";

// 유효한 ImageType 및 VideoType 값들
const VALID_IMAGE_TYPES = Object.values(ImageType);
const VALID_VIDEO_TYPES = Object.values(VideoType);

// EntityType 검증 함수
function isValidEntityType(entityType: string): boolean {
  return (
    VALID_IMAGE_TYPES.includes(entityType as ImageType) ||
    VALID_VIDEO_TYPES.includes(entityType as VideoType)
  );
}

export async function GET(request: NextRequest) {
  // 1. 세션 확인 (필수)
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 2. 비즈니스 로직 (try-catch 내부)
  try {
    // 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    // entityType 및 entityId 검증
    if (!entityType || !isValidEntityType(entityType)) {
      return NextResponse.json(
        { error: "Invalid entity type" },
        { status: 400 }
      );
    }

    if (!entityId) {
      return NextResponse.json(
        { error: "Entity ID is required" },
        { status: 400 }
      );
    }

    // 이미지와 비디오 목록 가져오기
    let imageList: ListImagesByEntityResult = [];
    let videoList: ListVideosByEntityResult = [];

    // ImageType인 경우 이미지 목록 가져오기
    if (VALID_IMAGE_TYPES.includes(entityType as ImageType)) {
      try {
        const images = await listImagesByEntity(
          entityType as ImageType,
          entityId
        );
        imageList = images.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      } catch (error) {
        console.warn(`Failed to fetch images for ${entityType}:`, error);
      }
    }

    // VideoType인 경우 비디오 목록 가져오기
    if (VALID_VIDEO_TYPES.includes(entityType as VideoType)) {
      try {
        const videos = await listVideosByEntity(
          entityType as VideoType,
          entityId
        );
        videoList = videos.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      } catch (error) {
        console.warn(`Failed to fetch videos for ${entityType}:`, error);
      }
    }

    return NextResponse.json({
      imageList,
      videoList,
    });
  } catch (error) {
    // 3. 에러 로깅 (필수)
    await logApiError(request, error as Error, {
      errorCode: "MEDIA_LIST_001",
      userId: sessionOrResponse.id,
      metadata: { action: "listMediaByEntity" },
      tags: ["media", "list"],
    });

    return NextResponse.json(
      { error: "Failed to fetch media list" },
      { status: 500 }
    );
  }
}
