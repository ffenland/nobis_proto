// app/api/media/upload/video/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect, SessionContent } from "@/app/lib/session";
import {
  UploadPermissionResult,
  VideoUploadService,
} from "@/app/lib/services/upload.service";
import { VideoType } from "@prisma/client";
import prisma from "@/app/lib/prisma";
import { IronSession } from "iron-session";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    const formData = await request.formData();

    const file = formData.get("file") as File;
    const videoType = formData.get("type") as VideoType;
    const entityId = formData.get("entityId") as string;
    const duration = parseInt(formData.get("duration") as string) || 0;
    const autoDelete = formData.get("autoDelete") === "true";

    if (!file) {
      return NextResponse.json(
        { error: "파일이 필요합니다." },
        { status: 400 }
      );
    }

    // 권한 확인
    const canUpload = await checkVideoUploadPermission(
      session,
      videoType,
      entityId
    );
    if (!canUpload.allowed) {
      return NextResponse.json({ error: canUpload.reason }, { status: 403 });
    }

    const videoService = VideoUploadService.getInstance();

    // Mock 서비스에서는 자동 삭제 일수 무시
    const autoDeleteDays =
      process.env.USE_MOCK_SERVICES === "true" ? null : autoDelete ? 30 : null;

    const uploadResult = await videoService.uploadVideo(
      file,
      session.id,
      autoDeleteDays || undefined
    );

    // DB에 미디어 정보 저장
    const media = await prisma.media.create({
      data: {
        filename: uploadResult.filename,
        originalName: file.name,
        mimeType: uploadResult.mimeType,
        size: uploadResult.size,
        videoType,
        status: "ACTIVE", // Mock에서는 바로 ACTIVE
        streamId: uploadResult.streamId,
        publicUrl: uploadResult.publicUrl,
        embedUrl: uploadResult.embedUrl,
        thumbnailUrl: uploadResult.thumbnailUrl,
        duration: uploadResult.duration || duration,
        autoDeleteEnabled: autoDelete,
        ...(autoDeleteDays && {
          scheduledDeleteAt: new Date(
            Date.now() + autoDeleteDays * 24 * 60 * 60 * 1000
          ),
        }),
        uploadedById: session.id,
        ...(videoType === "PT_RECORD" &&
          entityId && { ptRecordItemId: entityId }),
        metadata: {
          uploadedAt: new Date().toISOString(),
          userAgent: request.headers.get("user-agent"),
          autoDeleteDays,
          isMockUpload: process.env.USE_MOCK_SERVICES === "true",
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
        autoDeleteEnabled: media.autoDeleteEnabled,
        scheduledDeleteAt: media.scheduledDeleteAt,
        publicUrl: media.publicUrl,
      },
    });
  } catch (error) {
    console.error("Video upload error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "업로드 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

async function checkVideoUploadPermission(
  session: IronSession<SessionContent>,
  videoType: VideoType,
  entityId?: string
): Promise<UploadPermissionResult> {
  // EXERCISE_DEMO는 TRAINER만 업로드 가능
  if (videoType === "EXERCISE_DEMO" && session.role !== "TRAINER") {
    return {
      allowed: false,
      reason: "운동 시연 영상은 트레이너만 업로드할 수 있습니다.",
    };
  }

  // PT_RECORD는 TRAINER만 업로드 가능
  if (videoType === "PT_RECORD" && session.role !== "TRAINER") {
    return {
      allowed: false,
      reason: "PT 기록은 트레이너만 업로드할 수 있습니다.",
    };
  }

  return { allowed: true };
}
