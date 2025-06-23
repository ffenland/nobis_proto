// app/lib/services/media.service.ts
import { PhotoType, VideoType, MediaStatus } from "@prisma/client";
import prisma from "@/app/lib/prisma";

// ========== 타입 정의 ==========
export interface MediaFilter {
  type?: "image" | "video";
  photoType?: PhotoType;
  videoType?: VideoType;
  status?: MediaStatus;
  entityId?: string;
  uploadedById?: string;
}

export interface MediaPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MediaListQuery {
  filter?: MediaFilter;
  pagination: {
    page: number;
    limit: number;
  };
  orderBy?: {
    field: "createdAt" | "size" | "filename";
    direction: "asc" | "desc";
  };
}

export interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: PhotoType | null;
  videoType: VideoType | null;
  status: MediaStatus;
  publicUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  createdAt: Date;
  updatedAt: Date;
  scheduledDeleteAt: Date | null;
  autoDeleteEnabled: boolean;
  uploadedById: string;
}

export interface MediaWithRelations extends MediaItem {
  uploadedBy: {
    id: string;
    username: string;
    avatarMedia: {
      publicUrl: string;
      thumbnailUrl: string | null;
    } | null;
  };
  machine?: {
    id: string;
    title: string;
  } | null;
  fitnessCenter?: {
    id: string;
    title: string;
  } | null;
}

export interface MediaUsageStats {
  currentMonth: {
    imageCount: number;
    videoCount: number;
    totalStorage: number;
    estimatedCost: number;
  };
  limits: {
    maxImages: number;
    maxVideos: number;
    maxStorage: number;
  };
  recommendations: string[];
}

export interface MediaListResult {
  media: MediaItem[];
  pagination: MediaPagination;
}

// ========== 서비스 구현 ==========
export class MediaService {
  private static instance: MediaService;

  private constructor() {}

  static getInstance(): MediaService {
    if (!MediaService.instance) {
      MediaService.instance = new MediaService();
    }
    return MediaService.instance;
  }

  async getMediaList(query: MediaListQuery): Promise<MediaListResult> {
    const { filter = {}, pagination, orderBy } = query;

    // WHERE 조건 생성
    const where = this.buildWhereCondition(filter);

    // 정렬 조건 생성
    const orderByCondition = orderBy
      ? { [orderBy.field]: orderBy.direction }
      : { createdAt: "desc" as const };

    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        select: {
          id: true,
          filename: true,
          originalName: true,
          mimeType: true,
          size: true,
          type: true,
          videoType: true,
          status: true,
          publicUrl: true,
          thumbnailUrl: true,
          duration: true,
          createdAt: true,
          updatedAt: true,
          scheduledDeleteAt: true,
          autoDeleteEnabled: true,
          uploadedById: true,
        },
        orderBy: orderByCondition,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      prisma.media.count({ where }),
    ]);

    return {
      media,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  async getMediaById(id: string): Promise<MediaWithRelations | null> {
    return await prisma.media.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: {
            id: true,
            username: true,
            avatarMedia: {
              select: {
                publicUrl: true,
                thumbnailUrl: true,
              },
            },
          },
        },
        machine: {
          select: {
            id: true,
            title: true,
          },
        },
        fitnessCenter: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  async updateMediaStatus(
    id: string,
    status: MediaStatus,
    updatedById: string
  ): Promise<MediaItem> {
    // 권한 확인 - 업로드한 사용자나 관리자만 수정 가능
    const media = await prisma.media.findUnique({
      where: { id },
      select: { uploadedById: true },
    });

    if (!media) {
      throw new Error("미디어를 찾을 수 없습니다.");
    }

    // 권한 확인 로직은 API 레벨에서 처리하는 것이 좋음
    // 여기서는 단순히 업데이트만 수행

    return await prisma.media.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }

  async deleteMedia(id: string): Promise<void> {
    await prisma.media.update({
      where: { id },
      data: {
        status: "DELETED",
        scheduledDeleteAt: null,
        updatedAt: new Date(),
      },
    });
  }

  async getUserMediaUsage(userId: string): Promise<MediaUsageStats> {
    const currentMonth = new Date().toISOString().slice(0, 7);

    // 현재 월 사용량 조회
    let usage = await prisma.mediaUsage.findUnique({
      where: { userId_month: { userId, month: currentMonth } },
    });

    if (!usage) {
      usage = await prisma.mediaUsage.create({
        data: { userId, month: currentMonth },
      });
    }

    // 사용자 타입별 제한
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isPremiumUser: true },
    });

    const limits = this.getUserLimits(
      user?.role || "MEMBER",
      user?.isPremiumUser || false
    );
    const recommendations = this.generateRecommendations(usage, limits);

    return {
      currentMonth: {
        imageCount: usage.imageCount,
        videoCount: usage.videoCount,
        totalStorage: usage.imageStorageBytes + usage.videoStorageBytes,
        estimatedCost: usage.estimatedCost,
      },
      limits,
      recommendations,
    };
  }

  private buildWhereCondition(filter: MediaFilter) {
    const where: Record<string, unknown> = {
      status: filter.status || "ACTIVE",
    };

    if (filter.uploadedById) {
      where.uploadedById = filter.uploadedById;
    }

    if (filter.type === "image") {
      where.type = { not: null };
    } else if (filter.type === "video") {
      where.videoType = { not: null };
    }

    if (filter.photoType) {
      where.type = filter.photoType;
    }

    if (filter.videoType) {
      where.videoType = filter.videoType;
    }

    if (filter.entityId) {
      where.OR = [
        { machineId: filter.entityId },
        { fitnessCenterId: filter.entityId },
        { ptRecordItemId: filter.entityId },
      ];
    }

    return where;
  }

  private getUserLimits(role: string, isPremium: boolean) {
    if (role === "TRAINER") {
      return {
        maxImages: 1000,
        maxVideos: 200,
        maxStorage: 10 * 1024 * 1024 * 1024, // 10GB
      };
    }

    if (isPremium) {
      return {
        maxImages: 500,
        maxVideos: 100,
        maxStorage: 5 * 1024 * 1024 * 1024, // 5GB
      };
    }

    return {
      maxImages: 50,
      maxVideos: 10,
      maxStorage: 1024 * 1024 * 1024, // 1GB
    };
  }

  private generateRecommendations(
    usage: {
      imageCount: number;
      videoCount: number;
      imageStorageBytes: number;
      videoStorageBytes: number;
    },
    limits: { maxImages: number; maxVideos: number; maxStorage: number }
  ): string[] {
    const recommendations: string[] = [];
    const totalStorage = usage.imageStorageBytes + usage.videoStorageBytes;

    if (usage.imageCount >= limits.maxImages * 0.8) {
      recommendations.push(
        "이미지 업로드 제한에 근접했습니다. 불필요한 이미지를 삭제해보세요."
      );
    }

    if (usage.videoCount >= limits.maxVideos * 0.8) {
      recommendations.push(
        "동영상 업로드 제한에 근접했습니다. 오래된 동영상을 정리해보세요."
      );
    }

    if (totalStorage >= limits.maxStorage * 0.8) {
      recommendations.push(
        "저장 용량 제한에 근접했습니다. 프리미엄 플랜을 고려해보세요."
      );
    }

    if (recommendations.length === 0) {
      recommendations.push("현재 사용량이 안정적입니다.");
    }

    return recommendations;
  }

  // 배치 작업용 메서드들
  async getScheduledForDeletion(): Promise<MediaItem[]> {
    return await prisma.media.findMany({
      where: {
        status: "SCHEDULED_DELETE",
        scheduledDeleteAt: {
          lte: new Date(),
        },
      },
    });
  }

  async markAsProcessing(ids: string[]): Promise<void> {
    await prisma.media.updateMany({
      where: { id: { in: ids } },
      data: { status: "PROCESSING" },
    });
  }
}
