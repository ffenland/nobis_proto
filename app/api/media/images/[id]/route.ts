// app/api/media/images/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/lib/session';
import { getImageInfo } from '@/app/lib/services/media/image.service';
import { getImageById, deleteImageWithCloudflare } from '@/app/lib/services/media/image-db.service';

type Params = Promise<{ id: string }>;

// 이미지 정보 조회
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

    // UUID 형식인지 확인하여 DB ID인지 Cloudflare ID인지 구분
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    if (isUUID) {
      // DB에서 이미지 정보 조회
      const dbImage = await getImageById(id);
      
      if (!dbImage) {
        return NextResponse.json(
          { error: 'Image not found' },
          { status: 404 }
        );
      }

      // 권한 확인
      if (dbImage.uploadedById !== session.id && session.role !== 'MANAGER') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      return NextResponse.json(dbImage);
    } else {
      // Cloudflare ID로 조회 (하위 호환성)
      const imageInfo = await getImageInfo(id);
      
      if (!imageInfo) {
        return NextResponse.json(
          { error: 'Image not found' },
          { status: 404 }
        );
      }

      // 권한 확인 (메타데이터의 userId와 비교)
      if (imageInfo.meta?.userId && imageInfo.meta.userId !== session.id) {
        if (session.role !== 'MANAGER') {
          return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403 }
          );
        }
      }

      return NextResponse.json(imageInfo);
    }
  } catch (error) {
    console.error('Failed to get image info:', error);
    return NextResponse.json(
      { error: 'Failed to get image info' },
      { status: 500 }
    );
  }
}

// 이미지 삭제
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

    // UUID 형식인지 확인
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    if (!isUUID) {
      return NextResponse.json(
        { error: 'Invalid image ID format. Please use the database image ID.' },
        { status: 400 }
      );
    }

    // DB와 Cloudflare에서 모두 삭제
    try {
      await deleteImageWithCloudflare(id, session.id);
    } catch (error: any) {
      if (error.message === 'Image not found') {
        return NextResponse.json(
          { error: 'Image not found' },
          { status: 404 }
        );
      }
      if (error.message === 'Unauthorized to delete this image') {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
      throw error;
    }

    return NextResponse.json({ 
      success: true,
      message: 'Image deleted successfully from database and Cloudflare'
    });
  } catch (error) {
    console.error('Failed to delete image:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}