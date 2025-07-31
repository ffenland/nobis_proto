// app/api/media/videos/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/lib/session';
import { createVideoUploadUrl, createVideoTusUploadUrl } from '@/app/lib/services/media/stream.service';
import { generateMediaId, type EntityType, normalizeMetadata } from '@/app/lib/utils/media.utils';

// 요청 타입
interface VideoUploadRequest {
  entityType: EntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
  maxDurationSeconds?: number;
  requireSignedURLs?: boolean;
  useTus?: boolean; // TUS 프로토콜 사용 여부 (대용량 파일)
}

export async function POST(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getSession();
    if (!session.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 요청 파싱
    const body: VideoUploadRequest = await request.json();
    const { 
      entityType, 
      entityId, 
      metadata, 
      maxDurationSeconds,
      requireSignedURLs,
      useTus = false
    } = body;

    // entityType 검증
    const validEntityTypes: EntityType[] = ['profile', 'pt-record', 'exercise', 'chat', 'review'];
    if (!validEntityTypes.includes(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entity type' },
        { status: 400 }
      );
    }

    // 권한 검증
    if (entityType === 'pt-record' && session.role !== 'TRAINER') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // 영상 길이 제한 (역할별)
    let maxDuration = maxDurationSeconds;
    if (!maxDuration) {
      switch (session.role) {
        case 'TRAINER':
          maxDuration = 600; // 10분
          break;
        case 'MEMBER':
          maxDuration = 300; // 5분
          break;
        default:
          maxDuration = 180; // 3분
      }
    }

    // creator ID 생성 (사용자 식별용)
    const creatorId = `${session.role.toLowerCase()}-${session.id}`;

    // 메타데이터 구성
    const videoMetadata = {
      ...normalizeMetadata(metadata || {}),
      userId: session.id,
      userRole: session.role,
      entityType,
      entityId: entityId || '',
      uploadedAt: new Date().toISOString(),
    };

    if (useTus) {
      // TUS 프로토콜 사용 (대용량 파일)
      const tusResponse = await createVideoTusUploadUrl({
        creator: creatorId,
        metadata: videoMetadata,
        maxDurationSeconds: maxDuration,
        requireSignedURLs: requireSignedURLs || false,
        expiry: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6시간 후 만료
      });

      return NextResponse.json({
        uploadURL: tusResponse.uploadURL,
        protocol: 'tus',
        maxDurationSeconds: maxDuration,
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      });
    } else {
      // 일반 Direct Upload
      const uploadResponse = await createVideoUploadUrl({
        creator: creatorId,
        metadata: videoMetadata,
        maxDurationSeconds: maxDuration,
        requireSignedURLs: requireSignedURLs || false,
        expiry: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2시간 후 만료
        thumbnailTimestampPct: 0.5, // 50% 지점 썸네일
      });

      return NextResponse.json({
        uid: uploadResponse.uid,
        uploadURL: uploadResponse.uploadURL,
        protocol: 'direct',
        maxDurationSeconds: maxDuration,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      });
    }
  } catch (error) {
    console.error('Video upload URL creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create upload URL' },
      { status: 500 }
    );
  }
}