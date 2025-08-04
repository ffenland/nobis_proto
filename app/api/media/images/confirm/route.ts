// app/api/media/images/confirm/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getImageInfo } from "@/app/lib/services/media/image.service";
import {
  createImageRecord,
  getImageByCloudflareId,
} from "@/app/lib/services/media/image-db.service";
import { ImageType } from "@prisma/client";

// 업로드 확인 요청 타입
interface ConfirmUploadRequest {
  cloudflareId: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: ImageType;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 요청 파싱
    const body: ConfirmUploadRequest = await request.json();
    const {
      cloudflareId,
      originalName,
      mimeType,
      size,
      type,
      entityId,
      metadata,
    } = body;

    // 필수 필드 검증
    if (!cloudflareId || !originalName || !mimeType || !size || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 이미 DB에 존재하는지 확인
    const existingImage = await getImageByCloudflareId(cloudflareId);
    if (existingImage) {
      return NextResponse.json({
        id: existingImage.id,
        cloudflareId: existingImage.cloudflareId,
        message: "Image already exists in database",
      });
    }

    // Cloudflare에서 실제로 업로드되었는지 확인
    const cloudflareImage = await getImageInfo(cloudflareId);
    if (!cloudflareImage) {
      return NextResponse.json(
        { error: "Image not found in Cloudflare" },
        { status: 404 }
      );
    }

    // 메타데이터에서 사용자 ID 확인 (보안)
    if (
      !session ||
      (cloudflareImage.meta?.userId &&
        cloudflareImage.meta.userId !== session.id)
    ) {
      return NextResponse.json(
        { error: "Unauthorized - image uploaded by different user" },
        { status: 403 }
      );
    }

    // 엔티티별 연결 데이터 준비
    const entityConnections: Record<string, string | undefined> = {};

    // type에 따라 적절한 엔티티 연결
    switch (type) {
      case ImageType.PROFILE:
        // 프로필 이미지는 User의 avatarImageId로 직접 연결
        break;
      case ImageType.MACHINE:
        if (entityId) entityConnections.machineId = entityId;
        break;
      case ImageType.CENTER:
        if (entityId) entityConnections.fitnessCenterId = entityId;
        break;
      case ImageType.EXERCISE:
        if (entityId) entityConnections.freeExerciseId = entityId;
        break;
      case ImageType.STRETCHING:
        if (entityId) entityConnections.stretchingExerciseId = entityId;
        break;
      case ImageType.PT_RECORD:
        if (entityId) entityConnections.ptRecordItemId = entityId;
        break;
    }

    // DB에 이미지 레코드 생성
    const image = await createImageRecord({
      cloudflareId,
      uploadedById: session.id,
      originalName,
      mimeType,
      size,
      type,
      metadata: {
        ...metadata,
        cloudflareMetadata: cloudflareImage.meta,
      },
      ...entityConnections,
    });

    return NextResponse.json({
      id: image.id,
      cloudflareId: image.cloudflareId,
      originalName: image.originalName,
      type: image.type,
      createdAt: image.createdAt,
    });
  } catch (error) {
    console.error("Image confirmation failed:", error);
    return NextResponse.json(
      { error: "Failed to confirm image upload" },
      { status: 500 }
    );
  }
}
