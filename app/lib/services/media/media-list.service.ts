// app/lib/services/media/media-list.service.ts

import { listImages } from "./image.service";
import { listVideos } from "./stream.service";
import { getOptimizedImageUrl } from "@/app/lib/utils/media.utils";
import type { EntityType } from "@/app/lib/utils/media.utils";

interface MediaItem {
  id: string;
  type: "image" | "video";
  url?: string;
  thumbnailUrl?: string;
  metadata?: {
    uploadedAt?: string;
    size?: number;
    duration?: number;
    [key: string]: unknown;
  };
}

interface GetMediaListParams {
  userId: string;
  userRole: string;
  entityType: EntityType;
  entityId?: string;
}

/**
 * 엔티티 타입과 ID로 미디어 목록 조회
 * Cloudflare에서 이미지와 비디오를 병렬로 가져와 필터링
 */
export async function getMediaList(params: GetMediaListParams): Promise<MediaItem[]> {
  const { userId, userRole, entityType, entityId } = params;
  
  // creator ID로 필터링하기 위한 문자열 생성
  const creatorFilter = `${userRole.toLowerCase()}-${userId}`;

  // 병렬로 이미지와 비디오 목록 가져오기
  // 참고: listImages API는 search 파라미터를 지원하지 않으므로 
  // 전체 목록을 가져온 후 메타데이터로 필터링
  const [imagesResponse, videosResponse] = await Promise.allSettled([
    listImages({ page: 1, perPage: 100 }), // 최대 100개로 제한
    listVideos({ creator: creatorFilter, limit: 100 }),
  ]);

  // 미디어 아이템 변환
  const mediaItems: MediaItem[] = [];

  // 이미지 처리
  if (imagesResponse.status === "fulfilled" && imagesResponse.value.images) {
    for (const img of imagesResponse.value.images) {
      // 메타데이터에서 entityType과 entityId 확인
      if (
        img.meta?.entityType === entityType &&
        (!entityId || img.meta?.entityId === entityId) &&
        img.meta?.userId === userId // 추가 검증
      ) {
        mediaItems.push({
          id: img.id,
          type: "image",
          url: getOptimizedImageUrl(img.id, "public"),
          thumbnailUrl: getOptimizedImageUrl(img.id, "thumbnail"),
          metadata: {
            uploadedAt: img.uploaded.toISOString(),
            ...img.meta,
          },
        });
      }
    }
  } else if (imagesResponse.status === "rejected") {
    console.error("Failed to list images:", imagesResponse.reason);
  }

  // 비디오 처리
  if (videosResponse.status === "fulfilled" && videosResponse.value.videos) {
    for (const video of videosResponse.value.videos) {
      // 메타데이터에서 entityType과 entityId 확인
      if (
        video.meta?.entityType === entityType &&
        (!entityId || video.meta?.entityId === entityId) &&
        video.meta?.userId === userId // 추가 검증
      ) {
        mediaItems.push({
          id: video.uid,
          type: "video",
          url: video.playback?.hls,
          thumbnailUrl: video.thumbnail,
          metadata: {
            uploadedAt: video.created.toISOString(),
            size: video.size,
            duration: video.duration,
            ...video.meta,
          },
        });
      }
    }
  } else if (videosResponse.status === "rejected") {
    console.error("Failed to list videos:", videosResponse.reason);
  }

  // 업로드 날짜 기준으로 정렬 (최신순)
  mediaItems.sort((a, b) => {
    const dateA = new Date(a.metadata?.uploadedAt || 0);
    const dateB = new Date(b.metadata?.uploadedAt || 0);
    return dateB.getTime() - dateA.getTime();
  });

  return mediaItems;
}

/**
 * 엔티티 타입 검증
 */
export function isValidEntityType(entityType: string): entityType is EntityType {
  const validEntityTypes: EntityType[] = [
    "profile",
    "pt-record",
    "exercise",
    "chat",
    "review",
  ];
  return validEntityTypes.includes(entityType as EntityType);
}

// 타입 추론
export type GetMediaListResult = Awaited<ReturnType<typeof getMediaList>>;