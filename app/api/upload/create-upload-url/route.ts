// app/api/upload/create-upload-url/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import {
  DirectUploadService,
  validateFileType,
  validateFileSize,
} from "@/app/lib/services/cloudflare-direct.service";

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
      category, // PhotoType | VideoType 카테고리
      ptId,
      ptRecordId,
      recordType,
      autoDeleteDays,
      fileName,
      fileSize,
      fileType,
      maxDurationSeconds, // 비디오 전용
    } = body;

    // 필수 필드 검증
    if (!type || !category) {
      return NextResponse.json(
        { error: "type과 category는 필수입니다." },
        { status: 400 }
      );
    }

    if (!['image', 'video'].includes(type)) {
      return NextResponse.json(
        { error: "type은 'image' 또는 'video'여야 합니다." },
        { status: 400 }
      );
    }

    // 파일 타입 검증 (옵셔널)
    if (fileName && fileType) {
      const mockFile = new File([""], fileName, { type: fileType });
      
      if (!validateFileType(mockFile, type)) {
        return NextResponse.json(
          { error: `지원하지 않는 ${type} 파일 형식입니다.` },
          { status: 400 }
        );
      }

      if (fileSize && !validateFileSize(mockFile, type)) {
        const maxSize = type === 'image' ? '10MB' : '200MB';
        return NextResponse.json(
          { error: `파일 크기가 ${maxSize}를 초과합니다.` },
          { status: 400 }
        );
      }
    }

    const uploadService = DirectUploadService.getInstance();

    if (type === 'video') {
      // Cloudflare Stream 업로드 URL 생성
      const uploadData = await uploadService.createVideoUploadUrl(
        session.id,
        category,
        maxDurationSeconds
      );
      
      return NextResponse.json({
        success: true,
        type: 'video',
        uploadUrl: uploadData.uploadUrl,
        streamId: uploadData.videoId,
        embedUrl: uploadData.embedUrl,
        thumbnailUrl: uploadData.thumbnailUrl,
      });
    } else {
      // Cloudflare Images 업로드 URL 생성
      const uploadData = await uploadService.createImageUploadUrl(
        session.id,
        category
      );
      
      return NextResponse.json({
        success: true,
        type: 'image',
        uploadUrl: uploadData.uploadUrl,
        imageId: uploadData.imageId,
        publicUrl: uploadData.publicUrl,
      });
    }

  } catch (error) {
    console.error("업로드 URL 생성 오류:", error);
    
    return NextResponse.json(
      { 
        error: "업로드 URL 생성에 실패했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류"
      },
      { status: 500 }
    );
  }
}