// app/api/media/videos/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/lib/session';
import { getVideoInfo, deleteVideo } from '@/app/lib/services/media/stream.service';
import prisma from '@/app/lib/prisma';

type Params = Promise<{ id: string }>;

// 비디오 정보 조회
export async function GET(
  request: NextRequest,
  props: { params: Params }
) {
  try {
    const params = await props.params;
    const { id } = params;
    
    // 세션 확인
    const session = await getSession();
    if (!session.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 비디오 정보 조회
    const videoInfo = await getVideoInfo(id);
    
    if (!videoInfo) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // 권한 확인 (메타데이터의 userId와 비교)
    if (videoInfo.meta?.userId && videoInfo.meta.userId !== session.id) {
      // 관리자는 모든 비디오 조회 가능
      if (session.role !== 'MANAGER') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(videoInfo);
  } catch (error) {
    console.error('Failed to get video info:', error);
    return NextResponse.json(
      { error: 'Failed to get video info' },
      { status: 500 }
    );
  }
}

// 비디오 삭제
export async function DELETE(
  request: NextRequest,
  props: { params: Params }
) {
  try {
    const params = await props.params;
    const { id } = params;
    
    // 세션 확인
    const session = await getSession();
    if (!session.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // UUID 형식인지 확인하여 DB ID인지 Cloudflare ID인지 구분
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    let videoStreamId: string;
    let dbVideoId: string | null = null;
    
    if (isUUID) {
      // DB에서 비디오 정보 조회
      const dbVideo = await prisma.video.findUnique({
        where: { id },
        select: {
          id: true,
          streamId: true,
          uploadedById: true,
        },
      });
      
      if (!dbVideo) {
        return NextResponse.json(
          { error: 'Video not found' },
          { status: 404 }
        );
      }
      
      // 권한 확인
      if (dbVideo.uploadedById !== session.id && session.role !== 'MANAGER') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
      
      videoStreamId = dbVideo.streamId;
      dbVideoId = dbVideo.id;
    } else {
      // Cloudflare Stream ID로 직접 처리 (하위 호환성)
      videoStreamId = id;
      
      // 비디오 정보 먼저 조회하여 권한 확인
      const videoInfo = await getVideoInfo(videoStreamId);
      
      if (!videoInfo) {
        return NextResponse.json(
          { error: 'Video not found' },
          { status: 404 }
        );
      }

      // 권한 확인
      if (videoInfo.meta?.userId && videoInfo.meta.userId !== session.id) {
        // 관리자는 모든 비디오 삭제 가능
        if (session.role !== 'MANAGER') {
          return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403 }
          );
        }
      }
    }

    // Cloudflare에서 먼저 삭제
    try {
      await deleteVideo(videoStreamId);
    } catch (error) {
      // 404 에러는 이미 삭제된 것으로 간주하고 계속 진행
      if (!(error instanceof Error && error.message?.includes('404'))) {
        console.error('Failed to delete from Cloudflare:', error);
        throw new Error('Failed to delete video from Cloudflare');
      }
      console.log('Video already deleted from Cloudflare or not found');
    }

    // DB에서도 삭제 (DB ID가 있는 경우)
    if (dbVideoId) {
      await prisma.video.update({
        where: { id: dbVideoId },
        data: { status: 'DELETED' },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete video:', error);
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { status: 500 }
    );
  }
}