// app/api/upload/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import prisma from "@/app/lib/prisma";
import {
  DirectUploadService,
  CloudflareImagesService,
  CloudflareStreamService,
  getPhotoTypeFromCategory,
  getVideoTypeFromCategory,
} from "@/app/lib/services/cloudflare-direct.service";
import { MediaStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      type, // 'image' | 'video'
      cloudflareId, // streamId 또는 imageId
      category,
      originalName,
      size,
      mimeType,
      ptId,
      ptRecordId,
      recordType,
      autoDeleteDays,
      // 비디오 전용 필드
      duration,
      resolution,
    } = body;

    // 필수 필드 검증
    if (!type || !cloudflareId || !category || !originalName) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다." },
        { status: 400 }
      );
    }

    let publicUrl: string;
    let thumbnailUrl: string | null = null;
    let embedUrl: string | null = null;
    let status: MediaStatus = MediaStatus.ACTIVE;

    // 자동 삭제 일정 계산
    let scheduledDeleteAt: Date | null = null;
    let autoDeleteEnabled = false;
    
    if (autoDeleteDays && autoDeleteDays > 0) {
      scheduledDeleteAt = new Date(Date.now() + autoDeleteDays * 24 * 60 * 60 * 1000);
      autoDeleteEnabled = true;
    }

    const uploadService = DirectUploadService.getInstance();

    if (type === 'video') {
      const streamService = CloudflareStreamService.getInstance();
      
      // Stream 상태 확인
      try {
        const streamStatus = await streamService.getVideoDetails(cloudflareId);
        
        // Stream이 아직 처리 중일 수 있음
        if (streamStatus.status?.state === 'inprogress') {
          status = MediaStatus.PROCESSING;
        }
      } catch (error) {
        console.warn("Stream 상태 확인 실패:", error);
        status = MediaStatus.PROCESSING; // 안전하게 처리 중 상태로 설정
      }

      publicUrl = `https://videodelivery.net/${cloudflareId}/mp4`;
      thumbnailUrl = streamService.getThumbnailUrl(cloudflareId);
      embedUrl = streamService.getEmbedUrl(cloudflareId);
    } else {
      const imagesService = CloudflareImagesService.getInstance();
      publicUrl = imagesService.getPublicUrl(cloudflareId);
      thumbnailUrl = imagesService.getPublicUrl(cloudflareId, '80');
    }

    // 메타데이터 구성
    const metadata = {
      category,
      uploadDate: new Date().toISOString(),
      ...(ptId && { ptId }),
      ...(ptRecordId && { ptRecordId }),
      ...(recordType && { recordType }),
      ...(autoDeleteDays && { autoDeleteDays }),
    };

    // 데이터베이스에 Media 레코드 생성
    const media = await prisma.media.create({
      data: {
        filename: originalName,
        originalName,
        mimeType: mimeType || (type === 'video' ? 'video/mp4' : 'image/jpeg'),
        size: size || 0,
        type: type === 'image' ? getPhotoTypeFromCategory(category) : null,
        videoType: type === 'video' ? getVideoTypeFromCategory(category) : null,
        status,
        // Cloudflare 저장소 정보
        streamId: type === 'video' ? cloudflareId : null,
        cloudflareId: type === 'image' ? cloudflareId : null,
        publicUrl,
        thumbnailUrl,
        embedUrl,
        // 비디오 전용 필드
        duration: type === 'video' ? duration : null,
        resolution: type === 'video' ? resolution : null,
        // 자동 삭제 관련
        scheduledDeleteAt,
        autoDeleteEnabled,
        // 메타데이터
        metadata,
        // 업로드한 사용자
        uploadedById: session.id,
        // 연관 엔티티 (옵셔널)
        ...(ptRecordId && { ptRecordItemId: ptRecordId }),
      },
    });

    // 사용량 업데이트
    await updateMediaUsage(session.id, type, size || 0, duration);

    return NextResponse.json({
      success: true,
      media: {
        id: media.id,
        publicUrl: media.publicUrl,
        thumbnailUrl: media.thumbnailUrl,
        embedUrl: media.embedUrl,
        status: media.status,
        type: media.type || media.videoType,
        duration: media.duration,
      },
    });

  } catch (error) {
    console.error("업로드 완료 처리 오류:", error);
    
    return NextResponse.json(
      { 
        error: "업로드 완료 처리에 실패했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류"
      },
      { status: 500 }
    );
  }
}

// 미디어 사용량 업데이트 헬퍼 함수
async function updateMediaUsage(
  userId: string, 
  type: 'image' | 'video', 
  size: number, 
  duration?: number
) {
  const currentMonth = new Date().toISOString().slice(0, 7); // "2024-01" 형식

  const usage = await prisma.mediaUsage.upsert({
    where: {
      userId_month: {
        userId,
        month: currentMonth,
      },
    },
    update: {
      ...(type === 'image' && {
        imageCount: { increment: 1 },
        imageStorageBytes: { increment: size },
      }),
      ...(type === 'video' && {
        videoCount: { increment: 1 },
        videoStorageBytes: { increment: size },
        videoMinutes: { increment: Math.ceil((duration || 0) / 60) },
      }),
    },
    create: {
      userId,
      month: currentMonth,
      imageCount: type === 'image' ? 1 : 0,
      imageStorageBytes: type === 'image' ? size : 0,
      videoCount: type === 'video' ? 1 : 0,
      videoStorageBytes: type === 'video' ? size : 0,
      videoMinutes: type === 'video' ? Math.ceil((duration || 0) / 60) : 0,
    },
  });

  return usage;
}