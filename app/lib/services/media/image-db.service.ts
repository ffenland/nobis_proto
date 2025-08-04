// app/lib/services/media/image-db.service.ts

import prisma from '@/app/lib/prisma';
import { ImageType, ImageStatus, Prisma } from '@prisma/client';
import { deleteImage as deleteCloudflareImage } from './image.service';

// DB Image 레코드 생성
export async function createImageRecord(params: {
  cloudflareId: string;
  uploadedById: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: ImageType;
  metadata?: Record<string, unknown>;
  // 연결할 엔티티 (선택적)
  machineId?: string;
  fitnessCenterId?: string;
  ptRecordItemId?: string;
  equipmentId?: string;
  freeExerciseId?: string;
  stretchingExerciseId?: string;
}) {
  const {
    cloudflareId,
    uploadedById,
    originalName,
    mimeType,
    size,
    type,
    metadata,
    ...entityIds
  } = params;

  // 연결할 엔티티 데이터 구성
  const connectData: Prisma.ImageCreateInput = {
    cloudflareId,
    originalName,
    mimeType,
    size,
    type,
    status: ImageStatus.ACTIVE,
    uploadedBy: { connect: { id: uploadedById } },
    metadata: metadata ? metadata as Prisma.InputJsonValue : undefined,
  };

  // 엔티티 연결 (있는 경우만)
  if (entityIds.machineId) {
    connectData.machine = { connect: { id: entityIds.machineId } };
  }
  if (entityIds.fitnessCenterId) {
    connectData.fitnessCenter = { connect: { id: entityIds.fitnessCenterId } };
  }
  if (entityIds.ptRecordItemId) {
    connectData.ptRecordItem = { connect: { id: entityIds.ptRecordItemId } };
  }
  if (entityIds.equipmentId) {
    connectData.equipment = { connect: { id: entityIds.equipmentId } };
  }
  if (entityIds.freeExerciseId) {
    connectData.freeExercise = { connect: { id: entityIds.freeExerciseId } };
  }
  if (entityIds.stretchingExerciseId) {
    connectData.stretchingExercise = { connect: { id: entityIds.stretchingExerciseId } };
  }

  const image = await prisma.image.create({
    data: connectData,
    select: {
      id: true,
      cloudflareId: true,
      originalName: true,
      mimeType: true,
      size: true,
      type: true,
      status: true,
      createdAt: true,
      uploadedById: true,
    },
  });

  return image;
}

// DB에서 이미지 조회
export async function getImageById(imageId: string) {
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    select: {
      id: true,
      cloudflareId: true,
      originalName: true,
      mimeType: true,
      size: true,
      type: true,
      status: true,
      createdAt: true,
      uploadedById: true,
      uploadedBy: {
        select: {
          id: true,
          username: true,
          role: true,
        },
      },
      metadata: true,
    },
  });

  return image;
}

// Cloudflare ID로 이미지 조회
export async function getImageByCloudflareId(cloudflareId: string) {
  const image = await prisma.image.findUnique({
    where: { cloudflareId },
    select: {
      id: true,
      cloudflareId: true,
      originalName: true,
      mimeType: true,
      size: true,
      type: true,
      status: true,
      createdAt: true,
      uploadedById: true,
      metadata: true,
    },
  });

  return image;
}

// PT Record Item 미디어 소유권 확인
export async function checkPtRecordItemMediaOwnership(data: {
  ptRecordId: string;
  ptRecordItemId: string;
  trainerId: string;
}) {
  const ptRecordItem = await prisma.ptRecordItem.findFirst({
    where: {
      id: data.ptRecordItemId,
      ptRecord: {
        id: data.ptRecordId,
        pt: {
          trainerId: data.trainerId,
        },
      },
    },
    select: {
      id: true,
      ptRecord: {
        select: {
          pt: {
            select: {
              trainerId: true,
            },
          },
        },
      },
    },
  });

  return ptRecordItem;
}

// PT Record Item의 미디어 조회
export async function getMediaByPtRecordItem(ptRecordItemId: string) {
  const images = await prisma.image.findMany({
    where: {
      ptRecordItemId: ptRecordItemId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      cloudflareId: true,
      originalName: true,
      mimeType: true,
      size: true,
      type: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return images;
}

// PT Record Item 이미지 저장
export async function savePtRecordItemImage(params: {
  cloudflareId: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedById: string;
  ptRecordItemId: string;
}) {
  const image = await prisma.image.create({
    data: {
      cloudflareId: params.cloudflareId,
      originalName: params.originalName,
      mimeType: params.mimeType,
      size: params.size,
      type: 'PT_RECORD',
      uploadedById: params.uploadedById,
      ptRecordItemId: params.ptRecordItemId,
      status: 'ACTIVE',
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

// 타입 추론
export type CheckPtRecordItemMediaOwnershipResult = Awaited<ReturnType<typeof checkPtRecordItemMediaOwnership>>;
export type GetMediaByPtRecordItemResult = Awaited<ReturnType<typeof getMediaByPtRecordItem>>;
export type SavePtRecordItemImageResult = Awaited<ReturnType<typeof savePtRecordItemImage>>;

// DB 레코드와 Cloudflare 이미지 동시 삭제
export async function deleteImageWithCloudflare(imageId: string, userId: string) {
  // 1. 먼저 이미지 정보 조회 및 권한 확인
  const image = await prisma.image.findUnique({
    where: { id: imageId },
    select: {
      id: true,
      cloudflareId: true,
      uploadedById: true,
      avatarUser: {
        select: { id: true },
      },
    },
  });

  if (!image) {
    throw new Error('Image not found');
  }

  // 2. 권한 확인
  if (image.uploadedById !== userId) {
    throw new Error('Unauthorized to delete this image');
  }

  // 3. Cloudflare에서 먼저 삭제 시도
  try {
    await deleteCloudflareImage(image.cloudflareId);
  } catch (error) {
    // 404 에러는 이미 삭제된 것으로 간주하고 계속 진행
    if (!(error instanceof Error && error.message?.includes('404'))) {
      console.error('Failed to delete from Cloudflare:', error);
      throw new Error('Failed to delete image from Cloudflare');
    }
    console.log('Image already deleted from Cloudflare or not found');
  }

  // 4. Cloudflare 삭제 성공 후 DB 처리
  const result = await prisma.$transaction(async (tx) => {
    // 아바타로 사용 중인지 확인
    if (image.avatarUser) {
      // 아바타로 사용 중이면 User의 avatarImageId를 null로 설정
      await tx.user.update({
        where: { id: image.avatarUser.id },
        data: { avatarImageId: null },
      });
    }

    // DB에서 완전히 삭제 (하드 삭제)
    const deletedImage = await tx.image.delete({
      where: { id: imageId },
    });

    return deletedImage;
  });

  return result;
}

// 사용자의 아바타 이미지 업데이트
export async function updateUserAvatarImage(
  userId: string, 
  newImageId: string | null
) {
  // 트랜잭션으로 안전하게 처리
  const result = await prisma.$transaction(async (tx) => {
    // 1. 현재 아바타 이미지 확인
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        avatarImageId: true,
        avatarImage: {
          select: {
            id: true,
            cloudflareId: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const oldImageId = user.avatarImageId;
    const oldImage = user.avatarImage;

    // 2. 새 이미지로 업데이트
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { avatarImageId: newImageId },
      select: {
        id: true,
        avatarImageId: true,
        avatarImage: {
          select: {
            id: true,
            cloudflareId: true,
          },
        },
      },
    });

    // 3. 기존 이미지가 있었다면 삭제 표시
    if (oldImageId && oldImage) {
      await tx.image.update({
        where: { id: oldImageId },
        data: { status: ImageStatus.DELETED },
      });
    }

    return { updatedUser, oldImage };
  });

  // 4. 기존 Cloudflare 이미지 삭제 (트랜잭션 외부)
  if (result.oldImage) {
    try {
      await deleteCloudflareImage(result.oldImage.cloudflareId);
    } catch (error) {
      console.error('Failed to delete old avatar from Cloudflare:', error);
    }
  }

  return result.updatedUser;
}

// 엔티티별 이미지 목록 조회
export async function getImagesByEntity(params: {
  entityType: 'machine' | 'fitnessCenter' | 'ptRecordItem' | 'equipment' | 'freeExercise' | 'stretchingExercise';
  entityId: string;
  includeDeleted?: boolean;
}) {
  const { entityType, entityId, includeDeleted = false } = params;

  const whereClause: Prisma.ImageWhereInput = {
    status: includeDeleted ? undefined : ImageStatus.ACTIVE,
  };

  // 엔티티별 조건 추가
  switch (entityType) {
    case 'machine':
      whereClause.machineId = entityId;
      break;
    case 'fitnessCenter':
      whereClause.fitnessCenterId = entityId;
      break;
    case 'ptRecordItem':
      whereClause.ptRecordItemId = entityId;
      break;
    case 'equipment':
      whereClause.equipmentId = entityId;
      break;
    case 'freeExercise':
      whereClause.freeExerciseId = entityId;
      break;
    case 'stretchingExercise':
      whereClause.stretchingExerciseId = entityId;
      break;
  }

  const images = await prisma.image.findMany({
    where: whereClause,
    select: {
      id: true,
      cloudflareId: true,
      originalName: true,
      mimeType: true,
      size: true,
      type: true,
      status: true,
      createdAt: true,
      uploadedBy: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return images;
}

// 타입 추론을 위한 export
export type CreateImageResult = Awaited<ReturnType<typeof createImageRecord>>;
export type ImageDetail = Awaited<ReturnType<typeof getImageById>>;
export type ImagesByEntity = Awaited<ReturnType<typeof getImagesByEntity>>;