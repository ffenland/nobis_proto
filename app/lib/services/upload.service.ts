// app/lib/services/upload.service.ts
import { PhotoType, VideoType } from "@prisma/client";
import {
  R2_CONFIG,
  STREAM_CONFIG,
  USE_MOCK_SERVICES,
} from "@/app/lib/config/upload";
import fs from "fs/promises";
import path from "path";

// ========== 타입 정의 ==========
export interface UploadResult {
  id: string;
  url: string;
  publicUrl: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface VideoUploadResult extends UploadResult {
  streamId: string;
  embedUrl: string;
  thumbnailUrl: string;
  duration?: number;
}

export interface MediaResponse {
  id: string;
  url: string;
  filename: string;
  size: number;
  type: PhotoType | null;
  createdAt: Date;
}

export interface VideoMediaResponse extends MediaResponse {
  streamId: string;
  embedUrl: string;
  thumbnailUrl: string;
  duration: number | null;
  autoDeleteEnabled: boolean;
  scheduledDeleteAt: Date | null;
  publicUrl: string;
}

export interface MediaListItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: PhotoType | null;
  videoType: VideoType | null;
  publicUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  createdAt: Date;
  scheduledDeleteAt: Date | null;
  autoDeleteEnabled: boolean;
}

export interface MediaListResponse {
  media: MediaListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MediaWithUploader {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: PhotoType | null;
  videoType: VideoType | null;
  publicUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  createdAt: Date;
  scheduledDeleteAt: Date | null;
  autoDeleteEnabled: boolean;
  uploadedBy: {
    id: string;
    username: string;
    avatarMedia: {
      publicUrl: string;
      thumbnailUrl: string | null;
    } | null;
  };
}

export interface UploadPermissionResult {
  allowed: boolean;
  reason?: string;
}

interface FileMetadata {
  uploadedAt: string;
  userAgent: string | null;
  isMockUpload?: boolean;
  autoDeleteDays?: number | null;
}

// ========== 서비스 구현 ==========

// Mock 파일 저장소 (개발용)
class MockFileStorage {
  private static uploadDir = path.join(process.cwd(), "public", "uploads");

  static async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  static async saveFile(file: File, filename: string): Promise<string> {
    await this.ensureUploadDir();

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(this.uploadDir, filename);

    await fs.writeFile(filePath, buffer);

    return `/uploads/${filename}`;
  }

  static async deleteFile(filename: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadDir, filename);
      await fs.unlink(filePath);
    } catch (error) {
      console.warn("Failed to delete file:", filename, error);
    }
  }
}

// 이미지 업로드 서비스
export class ImageUploadService {
  private static instance: ImageUploadService;

  private constructor() {}

  static getInstance(): ImageUploadService {
    if (!ImageUploadService.instance) {
      ImageUploadService.instance = new ImageUploadService();
    }
    return ImageUploadService.instance;
  }

  async uploadImage(
    file: File,
    photoType: PhotoType,
    userId: string
  ): Promise<UploadResult> {
    // 파일 유효성 검사
    this.validateImageFile(file);

    // 파일명 생성
    const filename = this.generateFilename(file, photoType, userId);

    let publicUrl: string;

    if (USE_MOCK_SERVICES) {
      // Mock 서비스 사용
      const mockPath = await MockFileStorage.saveFile(file, filename);
      publicUrl = `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }${mockPath}`;
    } else {
      // 실제 R2 업로드 (나중에 구현)
      publicUrl = await this.uploadToR2(file, filename);
    }

    return {
      id: crypto.randomUUID(),
      url: publicUrl,
      publicUrl,
      filename,
      size: file.size,
      mimeType: file.type,
    };
  }

  private validateImageFile(file: File): void {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (file.size > maxSize) {
      throw new Error("파일 크기는 10MB를 초과할 수 없습니다.");
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error("지원하지 않는 파일 형식입니다.");
    }
  }

  private generateFilename(
    file: File,
    photoType: PhotoType,
    userId: string
  ): string {
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().slice(0, 8);
    const ext = file.name.split(".").pop();

    return `${photoType.toLowerCase()}/${userId}/${timestamp}-${randomId}.${ext}`;
  }

  private async uploadToR2(file: File, filename: string): Promise<string> {
    // TODO: 실제 R2 업로드 구현
    // const command = new PutObjectCommand({...})
    // return await this.r2Client.send(command)

    throw new Error("R2 업로드는 아직 구현되지 않았습니다.");
  }

  async deleteImage(filename: string): Promise<void> {
    if (USE_MOCK_SERVICES) {
      await MockFileStorage.deleteFile(filename);
    } else {
      // TODO: 실제 R2 삭제 구현
      throw new Error("R2 삭제는 아직 구현되지 않았습니다.");
    }
  }
}

// 동영상 업로드 서비스
export class VideoUploadService {
  private static instance: VideoUploadService;

  private constructor() {}

  static getInstance(): VideoUploadService {
    if (!VideoUploadService.instance) {
      VideoUploadService.instance = new VideoUploadService();
    }
    return VideoUploadService.instance;
  }

  async uploadVideo(
    file: File,
    userId: string,
    autoDeleteDays?: number
  ): Promise<VideoUploadResult> {
    // 파일 유효성 검사
    this.validateVideoFile(file);

    // 파일명 생성
    const filename = this.generateFilename(file, userId);

    if (USE_MOCK_SERVICES) {
      // Mock 서비스 사용
      const mockPath = await MockFileStorage.saveFile(file, filename);
      const publicUrl = `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }${mockPath}`;

      return {
        id: crypto.randomUUID(),
        url: publicUrl,
        publicUrl,
        filename,
        size: file.size,
        mimeType: file.type,
        streamId: `mock-stream-${crypto.randomUUID()}`,
        embedUrl: `${publicUrl}?embed=true`,
        thumbnailUrl: `${publicUrl}?thumbnail=true`,
        duration: 60, // Mock duration
      };
    } else {
      // 실제 Stream 업로드
      return await this.uploadToStream(file, userId, autoDeleteDays);
    }
  }

  private validateVideoFile(file: File): void {
    const maxSize = 200 * 1024 * 1024; // 200MB
    const allowedTypes = ["video/mp4", "video/mov", "video/avi", "video/webm"];

    if (file.size > maxSize) {
      throw new Error("비디오 크기는 200MB를 초과할 수 없습니다.");
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error("지원하지 않는 비디오 형식입니다.");
    }
  }

  private generateFilename(file: File, userId: string): string {
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().slice(0, 8);
    const ext = file.name.split(".").pop();

    return `videos/${userId}/${timestamp}-${randomId}.${ext}`;
  }

  private async uploadToStream(
    file: File,
    userId: string,
    autoDeleteDays?: number
  ): Promise<VideoUploadResult> {
    // TODO: 실제 Cloudflare Stream 업로드 구현
    throw new Error("Stream 업로드는 아직 구현되지 않았습니다.");
  }

  async scheduleDelete(streamId: string, deleteDate: Date): Promise<void> {
    if (USE_MOCK_SERVICES) {
      console.log(`Mock: 비디오 ${streamId} 삭제 예약 - ${deleteDate}`);
      return;
    }

    // TODO: 실제 Stream 삭제 예약 구현
    throw new Error("Stream 삭제 예약은 아직 구현되지 않았습니다.");
  }

  async deleteVideo(streamId: string): Promise<void> {
    if (USE_MOCK_SERVICES) {
      console.log(`Mock: 비디오 ${streamId} 삭제`);
      return;
    }

    // TODO: 실제 Stream 삭제 구현
    throw new Error("Stream 삭제는 아직 구현되지 않았습니다.");
  }
}

// 공통 업로드 훅
export function useFileUpload() {
  const imageService = ImageUploadService.getInstance();
  const videoService = VideoUploadService.getInstance();

  return {
    uploadImage: imageService.uploadImage.bind(imageService),
    uploadVideo: videoService.uploadVideo.bind(videoService),
    deleteImage: imageService.deleteImage.bind(imageService),
    deleteVideo: videoService.deleteVideo.bind(videoService),
    scheduleVideoDelete: videoService.scheduleDelete.bind(videoService),
  };
}
