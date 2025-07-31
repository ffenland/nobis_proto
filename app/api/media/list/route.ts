// app/api/media/list/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/lib/session';
import { listImages } from '@/app/lib/services/media/image.service';
import { listVideos } from '@/app/lib/services/media/stream.service';
import { getOptimizedImageUrl } from '@/app/lib/utils/media.utils';
import type { EntityType } from '@/app/lib/utils/media.utils';

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url?: string;
  thumbnailUrl?: string;
  metadata?: {
    uploadedAt?: string;
    size?: number;
    duration?: number;
    [key: string]: unknown;
  };
}

export async function GET(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getSession();
    if (!session.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get('entityType') as EntityType;
    const entityId = searchParams.get('entityId') || undefined;

    // entityType 검증
    const validEntityTypes: EntityType[] = ['profile', 'pt-record', 'exercise', 'chat', 'review'];
    if (!entityType || !validEntityTypes.includes(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entity type' },
        { status: 400 }
      );
    }

    // creator ID로 필터링하기 위한 문자열 생성
    const creatorFilter = `${session.role.toLowerCase()}-${session.id}`;

    // 병렬로 이미지와 비디오 목록 가져오기
    const [imagesResponse, videosResponse] = await Promise.allSettled([
      listImages({ search: entityId }),
      listVideos({ creator: creatorFilter, limit: 100 }),
    ]);

    // 미디어 아이템 변환
    const mediaItems: MediaItem[] = [];

    // 이미지 처리
    if (imagesResponse.status === 'fulfilled' && imagesResponse.value.images) {
      for (const img of imagesResponse.value.images) {
        // 메타데이터에서 entityType과 entityId 확인
        if (img.meta?.entityType === entityType && 
            (!entityId || img.meta?.entityId === entityId)) {
          mediaItems.push({
            id: img.id,
            type: 'image',
            url: getOptimizedImageUrl(img.id, 'public'),
            thumbnailUrl: getOptimizedImageUrl(img.id, 'thumbnail'),
            metadata: {
              uploadedAt: img.uploaded.toISOString(),
              ...img.meta,
            },
          });
        }
      }
    } else if (imagesResponse.status === 'rejected') {
      console.error('Failed to list images:', imagesResponse.reason);
    }

    // 비디오 처리
    if (videosResponse.status === 'fulfilled' && videosResponse.value.videos) {
      for (const video of videosResponse.value.videos) {
        // 메타데이터에서 entityType과 entityId 확인
        if (video.meta?.entityType === entityType && 
            (!entityId || video.meta?.entityId === entityId)) {
          mediaItems.push({
            id: video.uid,
            type: 'video',
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
    } else if (videosResponse.status === 'rejected') {
      console.error('Failed to list videos:', videosResponse.reason);
    }

    // 업로드 날짜 기준으로 정렬 (최신순)
    mediaItems.sort((a, b) => {
      const dateA = new Date(a.metadata?.uploadedAt || 0);
      const dateB = new Date(b.metadata?.uploadedAt || 0);
      return dateB.getTime() - dateA.getTime();
    });

    return NextResponse.json(mediaItems);
  } catch (error) {
    console.error('Failed to fetch media list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media list' },
      { status: 500 }
    );
  }
}