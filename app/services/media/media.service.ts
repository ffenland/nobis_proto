// app/services/media/media.service.ts
// 미디어 비즈니스 로직 및 DB 작업 통합

import prisma from "@/app/lib/prisma";
import { ImageType, VideoType } from "@prisma/client";
import * as cloudflare from "./cloudflare.service";
import { getImageUrl } from "@/app/lib/utils/media.utils";
import type {
  CreateImageUploadUrlResult,
  CreateVideoUploadUrlResult,
} from "./cloudflare.service";
import type { ValidatedSession } from "@/app/lib/session";

// ===== 타입 정의 =====

export { ImageType, VideoType };

// 클라이언트에서 이미지 업로드 URL 요청 시 전달할 데이터
export interface ImageUploadRequest {
  entityType: ImageType;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

// 클라이언트에서 이미지 업로드 확인 시 전달할 데이터
export interface ImageConfirmRequest {
  cloudflareId: string;
  entityType: ImageType;
  entityId?: string;
  isPrimary?: true;
}

// 클라이언트에서 비디오 업로드 URL 요청 시 전달할 데이터
export interface VideoUploadRequest {
  entityType: VideoType;
  entityId?: string;
  metadata?: Record<string, unknown>;
  useTus?: boolean;
}

// 클라이언트에서 비디오 업로드 확인 시 전달할 데이터
export interface VideoConfirmRequest {
  streamId: string;
  entityType: VideoType;
  entityId?: string;
}

// ===== 이미지 서비스 =====

/**
 * 이미지 업로드 URL 요청
 */
export async function requestImageUpload(
  entityType: ImageType,
  entityId: string | null,
  session: ValidatedSession,
  metadata?: Record<string, unknown>
) {
  // 권한 검증
  validateImageUploadPermission(entityType, session);

  // 메타데이터 구성
  const uploadMetadata = {
    userId: session.id,
    userRole: session.role,
    entityType,
    entityId: entityId || "",
    uploadedAt: new Date().toISOString(),
    ...normalizeMetadata(metadata || {}),
  };

  // Cloudflare upload URL 생성
  const result = await cloudflare.createImageUploadUrl(uploadMetadata);

  return {
    ...result,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
}

/**
 * 이미지 업로드 확인 및 DB 저장
 */
export async function confirmImageUpload(
  cloudflareId: string,
  entityType: ImageType,
  entityId: string | null,
  session: ValidatedSession,
  isPrimary?: true
) {
  // Cloudflare에서 실제 업로드 확인
  const imageInfo = await cloudflare.getImageInfo(cloudflareId);
  if (!imageInfo) {
    throw new Error("Image not found in Cloudflare");
  }

  // 메타데이터 권한 확인
  const metaUserId = cloudflare.getMetadataValue(imageInfo.meta, "userId");
  if (metaUserId) {
    // userId가 있으면 반드시 현재 사용자와 일치해야 함
    if (metaUserId !== session.id) {
      throw new Error("Unauthorized - image uploaded by different user");
    }
  } else {
    // userId 메타데이터가 없는 경우 - 레거시 업로드이거나 시스템 이미지
    console.warn(
      `Image ${cloudflareId} has no userId metadata - allowing access for session ${session.id}`
    );
    // 필요시 추가 검증 로직 (예: 관리자만 허용, 생성일 확인 등)
  }

  // isPrimary가 true인 경우: 트랜잭션으로 기존 이미지 isPrimary 초기화 후 생성
  if (isPrimary === true && entityId) {
    // entityIdField 결정
    let entityIdField: string;

    switch (entityType) {
      case "MACHINE":
        entityIdField = "machineId";
        break;
      case "CENTER":
        entityIdField = "fitnessCenterId";
        break;
      case "LESSON":
      case "CONDITION":
        entityIdField = "lessonId";
        break;
      case "EQUIPMENT":
        entityIdField = "equipmentId";
        break;
      case "FREE_EXERCISE":
        entityIdField = "freeExerciseId";
        break;
      case "STRETCHING":
        entityIdField = "stretchingExerciseId";
        break;
      case "CONTRACT":
        entityIdField = "ptId";
        break;
      default:
        // PROFILE, ETC 등 entityId가 없는 타입은 isPrimary 설정 불가
        throw new Error(
          `Cannot set primary image for type ${entityType} - no entity relationship`
        );
    }

    // 트랜잭션으로 원자적 업데이트
    const image = await prisma.$transaction(async (tx) => {
      // 1. 동일 entityId를 가진 모든 이미지의 isPrimary를 false로
      await tx.image.updateMany({
        where: {
          type: entityType,
          [entityIdField]: entityId,
        },
        data: {
          isPrimary: false,
        },
      });

      // 2. 새 이미지를 isPrimary: true로 생성
      return await tx.image.create({
        data: {
          cloudflareId,
          uploadedById: session.id,
          type: entityType,
          metadata: imageInfo.meta || {},
          isPrimary: true,
          // 엔티티별 연결
          ...(entityType === "MACHINE" ? { machineId: entityId } : {}),
          ...(entityType === "CENTER" ? { fitnessCenterId: entityId } : {}),
          ...(entityType === "FREE_EXERCISE"
            ? { freeExerciseId: entityId }
            : {}),
          ...(entityType === "STRETCHING"
            ? { stretchingExerciseId: entityId }
            : {}),
          ...(entityType === "LESSON" ? { lessonId: entityId } : {}),
          ...(entityType === "CONDITION" ? { lessonId: entityId } : {}),
          ...(entityType === "EQUIPMENT" ? { equipmentId: entityId } : {}),
          ...(entityType === "CONTRACT" ? { ptId: entityId } : {}),
        },
        select: {
          id: true,
          cloudflareId: true,
          type: true,
          isPrimary: true,
          createdAt: true,
        },
      });
    });

    return image;
  }

  // isPrimary가 undefined인 경우: 기존 로직 (일반 생성)
  const image = await prisma.image.create({
    data: {
      cloudflareId,
      uploadedById: session.id,
      type: entityType,
      metadata: imageInfo.meta || {},
      // 엔티티별 연결
      ...(entityType === "MACHINE" && entityId ? { machineId: entityId } : {}),
      ...(entityType === "CENTER" && entityId
        ? { fitnessCenterId: entityId }
        : {}),
      ...(entityType === "FREE_EXERCISE" && entityId
        ? { freeExerciseId: entityId }
        : {}),
      ...(entityType === "STRETCHING" && entityId
        ? { stretchingExerciseId: entityId }
        : {}),
      ...(entityType === "LESSON" && entityId ? { lessonId: entityId } : {}),
      ...(entityType === "CONDITION" && entityId ? { lessonId: entityId } : {}),
      ...(entityType === "EQUIPMENT" && entityId
        ? { equipmentId: entityId }
        : {}),
      ...(entityType === "CONTRACT" && entityId ? { ptId: entityId } : {}),
    },
    select: {
      id: true,
      cloudflareId: true,
      type: true,
      createdAt: true,
    },
  });

  return image;
}

/**
 * 이미지 삭제
 */
export async function deleteImage(imageId: string, session: ValidatedSession) {
  // DB에서 이미지 정보 조회
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    select: {
      id: true,
      cloudflareId: true,
      uploadedById: true,
    },
  });

  if (!image) {
    throw new Error("Image not found");
  }

  // 권한 확인 (업로더 본인 또는 관리자만)
  if (image.uploadedById !== session.id && session.role !== "MANAGER") {
    throw new Error("Unauthorized to delete this image");
  }

  try {
    // Cloudflare에서 먼저 삭제
    await cloudflare.deleteImage(image.cloudflareId);
  } catch (error) {
    console.error("Failed to delete from Cloudflare:", error);
    // Cloudflare 삭제 실패해도 계속 진행 (이미 삭제된 경우 등)
  }

  // DB에서 삭제 (hard delete - Image 모델에 deletedAt 필드 없음)
  await prisma.image.delete({
    where: { id: imageId },
  });

  return { success: true, message: "Image deleted successfully" };
}

/**
 * 대표 이미지 설정
 * 동일한 entityId를 가진 이미지들 중 하나만 isPrimary=true로 설정
 */
export async function setImagePrimary(imageId: string, session: ValidatedSession) {
  // 1. 이미지 조회 (존재 확인 + 메타 정보 획득)
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    select: {
      id: true,
      type: true,
      uploadedById: true,
      machineId: true,
      fitnessCenterId: true,
      lessonId: true,
      equipmentId: true,
      freeExerciseId: true,
      stretchingExerciseId: true,
      lessonConditionId: true,
      ptId: true,
    },
  });

  if (!image) {
    throw new Error("Image not found");
  }

  // 2. 권한 확인 (업로더 본인 또는 관리자만)
  if (image.uploadedById !== session.id && session.role !== "MANAGER") {
    throw new Error("Unauthorized to update this image");
  }

  // 3. entityId 필드 결정 (ImageType에 따라)
  let entityIdField: string;
  let entityIdValue: string | null;

  switch (image.type) {
    case "MACHINE":
      entityIdField = "machineId";
      entityIdValue = image.machineId;
      break;
    case "CENTER":
      entityIdField = "fitnessCenterId";
      entityIdValue = image.fitnessCenterId;
      break;
    case "LESSON":
    case "CONDITION":
      entityIdField = "lessonId";
      entityIdValue = image.lessonId;
      break;
    case "EQUIPMENT":
      entityIdField = "equipmentId";
      entityIdValue = image.equipmentId;
      break;
    case "FREE_EXERCISE":
      entityIdField = "freeExerciseId";
      entityIdValue = image.freeExerciseId;
      break;
    case "STRETCHING":
      entityIdField = "stretchingExerciseId";
      entityIdValue = image.stretchingExerciseId;
      break;
    case "CONTRACT":
      entityIdField = "ptId";
      entityIdValue = image.ptId;
      break;
    default:
      // PROFILE, ETC 등 entityId가 없는 타입은 isPrimary 설정 불가
      throw new Error(
        `Cannot set primary image for type ${image.type} - no entity relationship`
      );
  }

  if (!entityIdValue) {
    throw new Error("Image has no entity ID - cannot set as primary");
  }

  // 4. Transaction으로 원자적 업데이트
  const updatedImage = await prisma.$transaction(async (tx) => {
    // 4-a. 동일 entityId를 가진 모든 이미지의 isPrimary를 false로
    await tx.image.updateMany({
      where: {
        type: image.type,
        [entityIdField]: entityIdValue,
      },
      data: {
        isPrimary: false,
      },
    });

    // 4-b. 요청한 이미지의 isPrimary를 true로
    return await tx.image.update({
      where: { id: imageId },
      data: {
        isPrimary: true,
      },
      select: {
        id: true,
        cloudflareId: true,
        type: true,
        isPrimary: true,
        createdAt: true,
      },
    });
  });

  return updatedImage;
}

// ===== 비디오 서비스 =====

/**
 * 비디오 업로드 URL 요청
 */
export async function requestVideoUpload(
  entityType: VideoType,
  entityId: string | null,
  session: ValidatedSession,
  metadata?: Record<string, unknown>
): Promise<CreateVideoUploadUrlResult & { expiresAt: string }> {
  // 권한 검증
  validateVideoUploadPermission(entityType, session);

  // 메타데이터 구성
  const uploadMetadata = {
    userId: session.id,
    userRole: session.role,
    entityType,
    entityId: entityId || "",
    ...normalizeMetadata(metadata || {}),
  };

  // Cloudflare upload URL 생성
  const result = await cloudflare.createVideoUploadUrl(uploadMetadata);

  return {
    ...result,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
}

/**
 * 비디오 업로드 확인 및 DB 저장
 */
export async function confirmVideoUpload(
  streamId: string,
  entityType: VideoType,
  entityId: string | null,
  session: ValidatedSession
) {
  // Cloudflare에서 실제 업로드 확인
  const videoInfo = await cloudflare.getVideoInfo(streamId);
  if (!videoInfo) {
    throw new Error("Video not found in Cloudflare");
  }

  // 메타데이터 권한 확인
  const metaUserId = cloudflare.getMetadataValue(videoInfo.meta, "userId");
  if (metaUserId) {
    // userId가 있으면 반드시 현재 사용자와 일치해야 함
    if (metaUserId !== session.id) {
      throw new Error("Unauthorized - video uploaded by different user");
    }
  } else {
    // userId 메타데이터가 없는 경우 - 레거시 업로드이거나 시스템 비디오
    console.warn(
      `Video ${streamId} has no userId metadata - allowing access for session ${session.id}`
    );
    // 필요시 추가 검증 로직 (예: 관리자만 허용, 생성일 확인 등)
  }

  // DB에 저장
  const video = await prisma.video.create({
    data: {
      streamId: streamId,
      uploadedById: session.id,
      type: entityType,
      metadata: videoInfo.meta || {},
      // 엔티티별 연결 (VideoType에 따른)
      ...(entityType === "MACHINE" && entityId ? { machineId: entityId } : {}),
      ...(entityType === "LESSON" && entityId ? { lessonId: entityId } : {}),
      ...(entityType === "FORM_CHECK" && entityId
        ? { lessonId: entityId }
        : {}),
      ...(entityType === "FREE_EXERCISE" && entityId
        ? { freeExerciseId: entityId }
        : {}),
      ...(entityType === "STRETCHING" && entityId
        ? { stretchingId: entityId }
        : {}),
    },
    select: {
      id: true,
      streamId: true,
      type: true,
      createdAt: true,
    },
  });

  return video;
}

/**
 * 비디오 삭제
 */
export async function deleteVideo(videoId: string, session: ValidatedSession) {
  // DB에서 비디오 정보 조회
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      streamId: true,
      uploadedById: true,
    },
  });

  if (!video) {
    throw new Error("Video not found");
  }

  // 권한 확인 (업로더 본인 또는 관리자만)
  if (video.uploadedById !== session.id && session.role !== "MANAGER") {
    throw new Error("Unauthorized to delete this video");
  }

  try {
    // Cloudflare에서 먼저 삭제
    await cloudflare.deleteVideo(video.streamId);
  } catch (error) {
    console.error("Failed to delete from Cloudflare:", error);
    // Cloudflare 삭제 실패해도 계속 진행 (이미 삭제된 경우 등)
  }

  // DB에서 삭제 (hard delete - Video 모델에 deletedAt 필드 없음)
  await prisma.video.delete({
    where: { id: videoId },
  });

  return { success: true, message: "Video deleted successfully" };
}

// ===== 공통 유틸리티 =====

/**
 * Cloudflare Stream 비디오 URL 생성 (HLS 스트리밍용)
 */
export function getCloudflareStreamVideoUrl(streamId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_DELEVERY_URL;
  if (!baseUrl) {
    throw new Error("CLOUDFLARE_STREAM_DELIVERY_URL not configured");
  }
  return `${baseUrl}/${streamId}/manifest/video.m3u8`;
}

/**
 * Cloudflare Stream 움직이는 GIF 썸네일 URL 생성
 */
export function getCloudflareStreamThumbnailUrl(streamId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_DELEVERY_URL;
  if (!baseUrl) {
    throw new Error("CLOUDFLARE_STREAM_DELIVERY_URL not configured");
  }
  // 1초부터 4초간, 높이 64px, 8fps로 GIF 생성
  return `${baseUrl}/${streamId}/thumbnails/thumbnail.gif?time=1s&height=64&duration=4s&fps=8`;
}

/**
 * 엔티티별 이미지 목록 조회
 */
export async function listImagesByEntity(
  entityType: ImageType,
  entityId: string
) {
  const images = await prisma.image.findMany({
    where: {
      type: entityType,
      ...(entityType === "MACHINE" ? { machineId: entityId } : {}),
      ...(entityType === "CENTER" ? { fitnessCenterId: entityId } : {}),
      ...(entityType === "FREE_EXERCISE" ? { freeExerciseId: entityId } : {}),
      ...(entityType === "STRETCHING"
        ? { stretchingExerciseId: entityId }
        : {}),
      ...(entityType === "LESSON" ? { lessonId: entityId } : {}),
      ...(entityType === "CONDITION" ? { lessonId: entityId } : {}),
      ...(entityType === "EQUIPMENT" ? { equipmentId: entityId } : {}),
      ...(entityType === "CONTRACT" ? { ptId: entityId } : {}),
    },
    select: {
      id: true,
      cloudflareId: true,
      createdAt: true,
      uploadedBy: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return images.map((img) => ({
    ...img,
    url: getImageUrl(img.cloudflareId),
    thumbnailUrl: getImageUrl(img.cloudflareId, "thumbnail"),
  }));
}

/**
 * 엔티티별 비디오 목록 조회
 */
export async function listVideosByEntity(
  entityType: VideoType,
  entityId: string
) {
  const videos = await prisma.video.findMany({
    where: {
      type: entityType,
      // VideoType에 따라 올바른 필드로 조회
      ...(entityType === "MACHINE" ? { machineId: entityId } : {}),
      ...(entityType === "LESSON" ? { lessonId: entityId } : {}),
      ...(entityType === "FORM_CHECK" ? { lessonId: entityId } : {}),
      ...(entityType === "FREE_EXERCISE" ? { freeExerciseId: entityId } : {}),
      ...(entityType === "STRETCHING" ? { stretchingId: entityId } : {}),
    },
    select: {
      id: true,
      streamId: true,
      createdAt: true,
      uploadedBy: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return videos.map((vid) => ({
    ...vid,
    url: cloudflare.getVideoUrl(vid.streamId),
    thumbnailUrl: cloudflare.getVideoThumbnailUrl(vid.streamId),
  }));
}

// ===== 헬퍼 함수 =====

/**
 * 이미지 업로드 권한 검증
 */
function validateImageUploadPermission(
  entityType: ImageType,
  session: ValidatedSession
) {
  const restrictions: Partial<Record<ImageType, string[]>> = {
    MACHINE: ["MANAGER"],
    CENTER: ["MANAGER"],
    LESSON: ["TRAINER", "MANAGER"],
    CONDITION: ["TRAINER", "MANAGER"],
    EQUIPMENT: ["MANAGER"],
  };

  const allowedRoles = restrictions[entityType];
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    throw new Error(
      `Only ${allowedRoles.join(
        ", "
      )} can upload ${entityType.toLowerCase()} images`
    );
  }
}

/**
 * 비디오 업로드 권한 검증
 */
function validateVideoUploadPermission(
  entityType: VideoType,
  session: ValidatedSession
) {
  // VideoType에 따른 권한 검증
  const trainerOnlyTypes: VideoType[] = ["LESSON", "FORM_CHECK", "INSTRUCTION"];

  if (trainerOnlyTypes.includes(entityType) && session.role !== "TRAINER") {
    throw new Error("Only trainers can upload this type of video");
  }
}

/**
 * 메타데이터 정규화
 */
function normalizeMetadata(
  metadata: Record<string, unknown>
): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === "string") {
      normalized[key] = value;
    } else if (typeof value === "number" || typeof value === "boolean") {
      normalized[key] = String(value);
    } else if (value instanceof Date) {
      normalized[key] = value.toISOString();
    } else {
      normalized[key] = JSON.stringify(value);
    }
  }

  return normalized;
}

// 타입 추론
export type RequestImageUploadResult = Awaited<
  ReturnType<typeof requestImageUpload>
>;
export type ConfirmImageUploadResult = Awaited<
  ReturnType<typeof confirmImageUpload>
>;
export type SetImagePrimaryResult = Awaited<ReturnType<typeof setImagePrimary>>;
export type RequestVideoUploadResult = Awaited<
  ReturnType<typeof requestVideoUpload>
>;
export type ConfirmVideoUploadResult = Awaited<
  ReturnType<typeof confirmVideoUpload>
>;
export type ListImagesByEntityResult = Awaited<
  ReturnType<typeof listImagesByEntity>
>;
export type ListVideosByEntityResult = Awaited<
  ReturnType<typeof listVideosByEntity>
>;
