// app/api/media/upload/video/direct/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import { DirectUploadService } from "@/app/lib/services/cloudflare-direct.service";
import { VideoType } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    const { videoType, maxDurationSeconds, entityId } = await request.json();

    if (!videoType || !Object.values(VideoType).includes(videoType)) {
      return NextResponse.json(
        { error: "유효한 비디오 타입이 필요합니다." },
        { status: 400 }
      );
    }

    // 권한 확인 로직 (기존과 동일)
    // ...

    const directUploadService = DirectUploadService.getInstance();

    const uploadData = await directUploadService.createVideoUploadUrl(
      session.id,
      videoType,
      maxDurationSeconds
    );

    return NextResponse.json({
      success: true,
      uploadUrl: uploadData.uploadUrl,
      videoId: uploadData.videoId,
      embedUrl: uploadData.embedUrl,
      thumbnailUrl: uploadData.thumbnailUrl,
    });
  } catch (error) {
    console.error("Direct upload URL 생성 실패:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류" },
      { status: 500 }
    );
  }
}
