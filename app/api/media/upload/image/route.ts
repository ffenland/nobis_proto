// app/api/media/upload/image/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import { ImageUploadService } from "@/app/lib/services/upload.service";
import { PhotoType } from "@prisma/client";
import prisma from "@/app/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    const formData = await request.formData();

    const file = formData.get("file") as File;
    const photoType = formData.get("type") as PhotoType;
    const entityId = formData.get("entityId") as string;

    if (!file) {
      return NextResponse.json(
        { error: "파일이 필요합니다." },
        { status: 400 }
      );
    }

    if (!photoType || !Object.values(PhotoType).includes(photoType)) {
      return NextResponse.json(
        { error: "유효한 사진 타입이 필요합니다." },
        { status: 400 }
      );
    }

    // 권한 확인
    const canUpload = await checkImageUploadPermission(
      session,
      photoType,
      entityId
    );
    if (!canUpload.allowed) {
      return NextResponse.json({ error: canUpload.reason }, { status: 403 });
    }

    const imageService = ImageUploadService.getInstance();
    const uploadResult = await imageService.uploadImage(
      file,
      photoType,
      session.id
    );

    // DB에 미디어 정보 저장
    const media = await prisma.media.create({
      data: {
        filename: uploadResult.filename,
        originalName: file.name,
        mimeType: uploadResult.mimeType,
        size: uploadResult.size,
        type: photoType,
        status: "ACTIVE",
        r2Key: uploadResult.filename,
        publicUrl: uploadResult.publicUrl,
        uploadedById: session.id,
        ...(photoType === "MACHINE" && entityId && { machineId: entityId }),
        ...(photoType === "CENTER" &&
          entityId && { fitnessCenterId: entityId }),
        metadata: {
          uploadedAt: new Date().toISOString(),
          userAgent: request.headers.get("user-agent"),
          isMockUpload: process.env.USE_MOCK_SERVICES === "true",
        },
      },
    });

    return NextResponse.json({
      success: true,
      media: {
        id: media.id,
        url: media.publicUrl,
        filename: media.filename,
        size: media.size,
        type: media.type,
        createdAt: media.createdAt,
      },
    });
  } catch (error) {
    console.error("Image upload error:", error);
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

interface SessionUser {
  id: string;
  role: "MEMBER" | "TRAINER" | "MANAGER";
}

async function checkImageUploadPermission(
  session: SessionUser,
  photoType: PhotoType,
  entityId?: string
) {
  // PROFILE 사진은 본인만 업로드 가능
  if (photoType === "PROFILE") {
    return { allowed: true };
  }

  // MACHINE, CENTER 사진은 MANAGER만 업로드 가능
  if (
    (photoType === "MACHINE" || photoType === "CENTER") &&
    session.role !== "MANAGER"
  ) {
    return { allowed: false, reason: "권한이 없습니다." };
  }

  // PT_RECORD는 TRAINER만 업로드 가능
  if (photoType === "PT_RECORD" && session.role !== "TRAINER") {
    return {
      allowed: false,
      reason: "PT 기록은 트레이너만 업로드할 수 있습니다.",
    };
  }

  return { allowed: true };
}
