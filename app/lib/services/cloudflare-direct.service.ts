// app/lib/services/cloudflare-direct.service.ts
import { PhotoType, VideoType } from "@prisma/client";

// 환경설정
const CLOUDFLARE_CONFIG = {
  ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID!,
  ACCOUNT_HASH: process.env.CLOUDFLARE_ACCOUNT_HASH!,
  IMAGES_TOKEN: process.env.CLOUDFLARE_IMAGES_TOKEN!,
  STREAM_TOKEN: process.env.CLOUDFLARE_STREAM_TOKEN || process.env.CLOUDFLARE_API_TOKEN!,
};

// 업로드 메타데이터 타입
export interface UploadMetadata {
  userId: string;
  ptId?: string;
  ptRecordId?: string;
  recordType?: string;
  category: string;
  autoDeleteDays?: number;
}

// 이미지 Direct Upload URL 생성
export interface ImageUploadUrl {
  uploadURL: string;
  id: string;
}

// 동영상 Direct Upload URL 생성
export interface VideoUploadUrl {
  uploadURL: string;
  uid: string;
}

// 업로드 결과 타입
export interface CloudflareImageResult {
  id: string;
  filename: string;
  uploaded: string;
  requireSignedURLs: boolean;
  variants: string[];
}

export interface CloudflareVideoResult {
  uid: string;
  thumbnail: string;
  readyToStream: boolean;
  status: {
    state: string;
    pctComplete: string;
  };
  meta: {
    name: string;
  };
  duration: number;
  input: {
    width: number;
    height: number;
  };
  playback: {
    hls: string;
    dash: string;
  };
}

// Cloudflare Images 서비스
export class CloudflareImagesService {
  private static instance: CloudflareImagesService;

  static getInstance(): CloudflareImagesService {
    if (!CloudflareImagesService.instance) {
      CloudflareImagesService.instance = new CloudflareImagesService();
    }
    return CloudflareImagesService.instance;
  }

  // Direct Upload URL 생성 (클라이언트가 직접 업로드할 URL)
  async createDirectUploadUrl(
    metadata?: Record<string, string>
  ): Promise<ImageUploadUrl> {
    const formData = new FormData();
    formData.append("requireSignedURLs", "false");
    
    // 메타데이터가 있으면 JSON 문자열로 추가
    if (metadata && Object.keys(metadata).length > 0) {
      formData.append("metadata", JSON.stringify(metadata));
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.ACCOUNT_ID}/images/v2/direct_upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_CONFIG.IMAGES_TOKEN}`,
          // Content-Type 헤더 제거 - FormData가 자동으로 설정
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudflare Images API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        accountId: CLOUDFLARE_CONFIG.ACCOUNT_ID,
        hasToken: !!CLOUDFLARE_CONFIG.IMAGES_TOKEN
      });
      throw new Error(`Direct upload URL 생성 실패: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return {
      uploadURL: result.result.uploadURL,
      id: result.result.id,
    };
  }

  // 이미지 정보 조회
  async getImageDetails(imageId: string): Promise<CloudflareImageResult> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.ACCOUNT_ID}/images/v1/${imageId}`,
      {
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_CONFIG.IMAGES_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`이미지 정보 조회 실패: ${response.statusText}`);
    }

    const result = await response.json();
    return result.result;
  }

  // 이미지 삭제
  async deleteImage(imageId: string): Promise<void> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.ACCOUNT_ID}/images/v1/${imageId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_CONFIG.IMAGES_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`이미지 삭제 실패: ${response.statusText}`);
    }
  }

  // 이미지 공개 URL 생성
  getPublicUrl(imageId: string, variant: string = "public"): string {
    return `https://imagedelivery.net/${CLOUDFLARE_CONFIG.ACCOUNT_HASH}/${imageId}/${variant}`;
  }
}

// Cloudflare Stream 서비스
export class CloudflareStreamService {
  private static instance: CloudflareStreamService;

  static getInstance(): CloudflareStreamService {
    if (!CloudflareStreamService.instance) {
      CloudflareStreamService.instance = new CloudflareStreamService();
    }
    return CloudflareStreamService.instance;
  }

  // Direct Upload URL 생성 (클라이언트가 직접 업로드할 URL)
  async createDirectUploadUrl(
    maxDurationSeconds?: number,
    metadata?: Record<string, string>
  ): Promise<VideoUploadUrl> {
    const requestBody: any = {
      maxDurationSeconds: maxDurationSeconds || 3600, // 기본 1시간
      metadata: metadata || {},
    };

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.ACCOUNT_ID}/stream/direct_upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_CONFIG.STREAM_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Stream direct upload URL 생성 실패: ${response.statusText}`
      );
    }

    const result = await response.json();
    return {
      uploadURL: result.result.uploadURL,
      uid: result.result.uid,
    };
  }

  // 동영상 정보 조회
  async getVideoDetails(videoId: string): Promise<CloudflareVideoResult> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.ACCOUNT_ID}/stream/${videoId}`,
      {
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_CONFIG.STREAM_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`동영상 정보 조회 실패: ${response.statusText}`);
    }

    const result = await response.json();
    return result.result;
  }

  // 동영상 삭제
  async deleteVideo(videoId: string): Promise<void> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.ACCOUNT_ID}/stream/${videoId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_CONFIG.STREAM_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`동영상 삭제 실패: ${response.statusText}`);
    }
  }

  // 동영상 임베드 URL 생성
  getEmbedUrl(videoId: string): string {
    return `https://iframe.videodelivery.net/${videoId}`;
  }

  // 썸네일 URL 생성
  getThumbnailUrl(videoId: string): string {
    return `https://videodelivery.net/${videoId}/thumbnails/thumbnail.jpg`;
  }
}

// 통합 Direct Upload 서비스
export class DirectUploadService {
  private static instance: DirectUploadService;
  private imagesService = CloudflareImagesService.getInstance();
  private streamService = CloudflareStreamService.getInstance();

  static getInstance(): DirectUploadService {
    if (!DirectUploadService.instance) {
      DirectUploadService.instance = new DirectUploadService();
    }
    return DirectUploadService.instance;
  }

  // 이미지 업로드 URL 생성
  async createImageUploadUrl(
    userId: string,
    photoType: string
  ): Promise<{
    uploadUrl: string;
    imageId: string;
    publicUrl: string;
  }> {
    const metadata = {
      userId,
      photoType,
      uploadedAt: new Date().toISOString(),
    };

    const uploadData = await this.imagesService.createDirectUploadUrl(metadata);
    const publicUrl = this.imagesService.getPublicUrl(uploadData.id);
    // 커스텀 썸네일 variant 사용
    const thumbnailUrl = this.imagesService.getPublicUrl(uploadData.id, "80");

    return {
      uploadUrl: uploadData.uploadURL,
      imageId: uploadData.id,
      publicUrl,
      thumbnailUrl,
    };
  }

  // 동영상 업로드 URL 생성
  async createVideoUploadUrl(
    userId: string,
    videoType: string,
    maxDurationSeconds?: number
  ): Promise<{
    uploadUrl: string;
    videoId: string;
    embedUrl: string;
    thumbnailUrl: string;
  }> {
    const metadata = {
      userId,
      videoType,
      uploadedAt: new Date().toISOString(),
    };

    const uploadData = await this.streamService.createDirectUploadUrl(
      maxDurationSeconds,
      metadata
    );

    const embedUrl = this.streamService.getEmbedUrl(uploadData.uid);
    const thumbnailUrl = this.streamService.getThumbnailUrl(uploadData.uid);

    return {
      uploadUrl: uploadData.uploadURL,
      videoId: uploadData.uid,
      embedUrl,
      thumbnailUrl,
    };
  }

  // 이미지 정보 조회
  async getImageInfo(imageId: string) {
    return await this.imagesService.getImageDetails(imageId);
  }

  // 동영상 정보 조회
  async getVideoInfo(videoId: string) {
    return await this.streamService.getVideoDetails(videoId);
  }

  // 삭제
  async deleteImage(imageId: string) {
    return await this.imagesService.deleteImage(imageId);
  }

  async deleteVideo(videoId: string) {
    return await this.streamService.deleteVideo(videoId);
  }
}

// 헬퍼 함수들
export const validateFileType = (file: File, type: 'image' | 'video') => {
  const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
  
  if (type === 'image') {
    return imageTypes.includes(file.type);
  } else {
    return videoTypes.includes(file.type);
  }
};

export const validateFileSize = (file: File, type: 'image' | 'video') => {
  const maxImageSize = 10 * 1024 * 1024; // 10MB
  const maxVideoSize = 200 * 1024 * 1024; // 200MB
  
  if (type === 'image') {
    return file.size <= maxImageSize;
  } else {
    return file.size <= maxVideoSize;
  }
};

// PhotoType과 VideoType 매핑
export const getPhotoTypeFromCategory = (category: string): PhotoType => {
  const mapping: Record<string, PhotoType> = {
    'profile': 'PROFILE',
    'machine': 'MACHINE',
    'center': 'CENTER',
    'exercise': 'EXERCISE',
    'stretching': 'STRETCHING',
    'pt_record': 'PT_RECORD',
    'before_after': 'BEFORE_AFTER',
    'achievement': 'ACHIEVEMENT',
  };
  return mapping[category] || 'EXERCISE';
};

export const getVideoTypeFromCategory = (category: string): VideoType => {
  const mapping: Record<string, VideoType> = {
    'exercise_demo': 'EXERCISE_DEMO',
    'pt_record': 'PT_RECORD',
    'form_check': 'FORM_CHECK',
    'progress': 'PROGRESS',
    'instruction': 'INSTRUCTION',
  };
  return mapping[category] || 'PT_RECORD';
};
