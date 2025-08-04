// app/lib/services/media/video-db.service.ts

import prisma from "@/app/lib/prisma";
import { VideoType, VideoStatus, Prisma } from "@prisma/client";
import { deleteVideo as deleteCloudflareVideo } from "./stream.service";

// DB Video 레코드 생성
export async function createVideoRecord(params: {
  streamId: string;
  uploadedById: string;
  originalName: string;
  mimeType: string;
  size: number;
  duration?: number;
  type: VideoType;
  metadata?: Record<string, unknown>;
  // 연결할 엔티티 (선택적)
  ptRecordItemId?: string;
}) {
  const {
    streamId,
    uploadedById,
    originalName,
    mimeType,
    size,
    duration,
    type,
    metadata,
    ...entityIds
  } = params;

  // 연결할 엔티티 데이터 구성
  const connectData: Prisma.VideoCreateInput = {
    streamId,
    originalName,
    mimeType,
    size,
    duration: duration || 0,
    type,
    status: VideoStatus.READY,
    uploadedBy: { connect: { id: uploadedById } },
    metadata: metadata ? metadata as Prisma.InputJsonValue : undefined,
  };

  // 엔티티 연결 (있는 경우만)
  if (entityIds.ptRecordItemId) {
    connectData.ptRecordItem = { connect: { id: entityIds.ptRecordItemId } };
  }

  const video = await prisma.video.create({
    data: connectData,
    select: {
      id: true,
      streamId: true,
      originalName: true,
      mimeType: true,
      size: true,
      duration: true,
      type: true,
      status: true,
      createdAt: true,
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

  return video;
}

// PT Record Item 비디오 저장
export async function savePtRecordItemVideo(params: {
  streamId: string;
  originalName: string;
  mimeType: string;
  size: number;
  duration?: number;
  uploadedById: string;
  ptRecordItemId: string;
}) {
  const video = await prisma.video.create({
    data: {
      streamId: params.streamId,
      originalName: params.originalName,
      mimeType: params.mimeType,
      size: params.size,
      duration: params.duration || 0,
      type: "PT_RECORD",
      status: "READY",
      uploadedById: params.uploadedById,
      ptRecordItemId: params.ptRecordItemId,
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

// Stream ID로 비디오 조회
export async function getVideoByStreamId(streamId: string) {
  const video = await prisma.video.findUnique({
    where: { streamId },
    select: {
      id: true,
      streamId: true,
      originalName: true,
      mimeType: true,
      size: true,
      duration: true,
      type: true,
      status: true,
      createdAt: true,
      uploadedById: true,
      metadata: true,
    },
  });

  return video;
}

// PT Record Item의 비디오 조회
export async function getVideosByPtRecordItem(ptRecordItemId: string) {
  const videos = await prisma.video.findMany({
    where: {
      ptRecordItemId: ptRecordItemId,
      status: { not: "DELETED" },
    },
    select: {
      id: true,
      streamId: true,
      originalName: true,
      mimeType: true,
      size: true,
      duration: true,
      type: true,
      status: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return videos;
}

// DB 레코드와 Cloudflare 비디오 동시 삭제
export async function deleteVideoWithCloudflare(
  videoId: string,
  userId: string
) {
  // 1. 먼저 비디오 정보 조회 및 권한 확인
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      streamId: true,
      uploadedById: true,
      type: true,
      ptRecordItem: {
        select: {
          ptRecord: {
            select: {
              pt: {
                select: {
                  trainer: {
                    select: {
                      userId: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!video) {
    throw new Error("비디오를 찾을 수 없습니다.");
  }

  // 2. 권한 확인 (업로더 본인 또는 해당 PT의 트레이너)
  const isOwner = video.uploadedById === userId;
  const isTrainer = video.ptRecordItem?.ptRecord.pt.trainer?.userId === userId;

  if (!isOwner && !isTrainer) {
    throw new Error("비디오를 삭제할 권한이 없습니다.");
  }

  try {
    // 3. Cloudflare에서 먼저 삭제
    await deleteCloudflareVideo(video.streamId);
  } catch (error: any) {
    // 이미 삭제된 경우는 무시
    if (!error.message?.includes("404")) {
      throw error;
    }
  }

  // 4. DB에서 소프트 삭제
  const deletedVideo = await prisma.video.update({
    where: { id: videoId },
    data: {
      status: "DELETED",
    },
    select: {
      id: true,
      streamId: true,
    },
  });

  return deletedVideo;
}

// 타입 추론
export type CreateVideoRecordResult = Awaited<
  ReturnType<typeof createVideoRecord>
>;
export type SavePtRecordItemVideoResult = Awaited<
  ReturnType<typeof savePtRecordItemVideo>
>;
export type GetVideoByStreamIdResult = Awaited<
  ReturnType<typeof getVideoByStreamId>
>;
export type GetVideosByPtRecordItemResult = Awaited<
  ReturnType<typeof getVideosByPtRecordItem>
>;
export type DeleteVideoWithCloudflareResult = Awaited<
  ReturnType<typeof deleteVideoWithCloudflare>
>;
