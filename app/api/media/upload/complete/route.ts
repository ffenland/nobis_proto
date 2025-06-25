// app/api/media/upload/complete/route.ts (업로드 완료 후 DB 저장)
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import { DirectUploadService } from "@/app/lib/services/cloudflare-direct.service";
import prisma from "@/app/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    const {
      type, // 'image' | 'video'
      id, // imageId 또는 videoId
      photoType,
      videoType,
      entityId,
      originalName,
    } = await request.json();

    const directUploadService = DirectUploadService.getInstance();

    if (type === "image") {
      // 이미지 정보 조회
      const imageInfo = await directUploadService.getImageInfo(id);

      // DB에 저장
      const media = await prisma.media.create({
        data: {
          filename: imageInfo.filename || originalName,
          originalName: originalName,
          mimeType: "image/jpeg", // Cloudflare Images에서 최적화됨
          size: 0, // Cloudflare Images는 파일 크기 정보 제공 안함
          type: photoType,
          status: "ACTIVE",
          publicUrl: `https://imagedelivery.net/${process.env.CLOUDFLARE_ACCOUNT_ID}/${id}/public`,
          thumbnailUrl: `https://imagedelivery.net/${process.env.CLOUDFLARE_ACCOUNT_ID}/${id}/thumbnail`,
          uploadedById: session.id,
          ...(photoType === "PT_RECORD" &&
            entityId && { ptRecordItemId: entityId }),
          metadata: {
            cloudflareImageId: id,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      return NextResponse.json({
        success: true,
        media: {
          id: media.id,
          publicUrl: media.publicUrl,
          thumbnailUrl: media.thumbnailUrl,
        },
      });
    } else if (type === "video") {
      // 동영상 정보 조회
      const videoInfo = await directUploadService.getVideoInfo(id);

      // DB에 저장
      const media = await prisma.media.create({
        data: {
          filename: videoInfo.meta?.name || originalName,
          originalName: originalName,
          mimeType: "video/mp4", // Stream에서 최적화됨
          size: 0, // Stream은 파일 크기 정보 제공 안함
          videoType: videoType,
          status: videoInfo.readyToStream ? "ACTIVE" : "PROCESSING",
          streamId: id,
          publicUrl: `https://iframe.videodelivery.net/${id}`,
          embedUrl: `https://iframe.videodelivery.net/${id}`,
          thumbnailUrl: `https://videodelivery.net/${id}/thumbnails/thumbnail.jpg`,
          duration: videoInfo.duration,
          resolution: videoInfo.input
            ? `${videoInfo.input.width}x${videoInfo.input.height}`
            : null,
          uploadedById: session.id,
          ...(videoType === "PT_RECORD" &&
            entityId && { ptRecordItemId: entityId }),
          metadata: {
            cloudflareVideoId: id,
            uploadedAt: new Date().toISOString(),
            playbackUrls: videoInfo.playback,
          },
        },
      });

      return NextResponse.json({
        success: true,
        media: {
          id: media.id,
          streamId: media.streamId,
          embedUrl: media.embedUrl,
          thumbnailUrl: media.thumbnailUrl,
          duration: media.duration,
          readyToStream: videoInfo.readyToStream,
        },
      });
    }

    return NextResponse.json(
      { error: "지원하지 않는 미디어 타입입니다." },
      { status: 400 }
    );
  } catch (error) {
    console.error("업로드 완료 처리 실패:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류" },
      { status: 500 }
    );
  }
}
