// app/api/media/videos/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/lib/session';
import { getVideoInfo, deleteVideo } from '@/app/lib/services/media/stream.service';

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

    // 비디오 정보 먼저 조회하여 권한 확인
    const videoInfo = await getVideoInfo(id);
    
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

    // 비디오 삭제
    await deleteVideo(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete video:', error);
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { status: 500 }
    );
  }
}