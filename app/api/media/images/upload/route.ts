// app/api/media/images/upload/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { createImageUploadUrl } from "@/app/lib/services/media/image.service";
import {
  generateMediaId,
  normalizeMetadata,
} from "@/app/lib/utils/media.utils";
import { ImageType } from "@prisma/client";

// 요청 타입
interface ImageUploadRequest {
  entityType: ImageType;
  entityId?: string;
  metadata?: Record<string, unknown>;
  requireSignedURLs?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 요청 파싱
    const body: ImageUploadRequest = await request.json();
    const { entityType, entityId, metadata, requireSignedURLs } = body;

    // entityType 검증 (Prisma enum 값들로 체크)
    const validEntityTypes = Object.values(ImageType);
    if (!validEntityTypes.includes(entityType)) {
      return NextResponse.json(
        { error: "Invalid entity type" },
        { status: 400 }
      );
    }

    // 권한 검증 (Prisma ImageType enum 값 사용)
    if (entityType === ImageType.PT_RECORD && session.role !== "TRAINER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 머신 이미지는 매니저만 가능
    if (entityType === ImageType.MACHINE && session.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 컨디션 이미지는 트레이너만 가능
    if (entityType === ImageType.CONDITION && session.role !== "TRAINER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 커스텀 ID 생성
    const customId = generateMediaId({
      userId: session.id,
      entityType,
      entityId,
      mediaType: "image",
      timestamp: true, // 중복 방지를 위해 타임스탬프 추가
    });

    // 메타데이터 구성
    const imageMetadata = {
      ...normalizeMetadata(metadata || {}),
      userId: session.id,
      userRole: session.role,
      entityType,
      entityId: entityId || "",
      uploadedAt: new Date().toISOString(),
    };

    // Direct Upload URL 생성
    const uploadResponse = await createImageUploadUrl({
      customId,
      metadata: imageMetadata,
      requireSignedURLs: requireSignedURLs || false,
      expiry: new Date(Date.now() + 30 * 60 * 1000), // 30분 후 만료
    });

    return NextResponse.json({
      id: uploadResponse.id,
      uploadURL: uploadResponse.uploadURL,
      customId,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error("Image upload URL creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create upload URL" },
      { status: 500 }
    );
  }
}
