// app/lib/utils/media.utils.ts

// Cloudflare Images Delivery URL
const CLOUDFLARE_IMAGES_DELIVERY_URL =
  process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_DELIVERY_URL ||
  "https://imagedelivery.net";
const CLOUDFLARE_ACCOUNT_HASH =
  process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH || "";

// 타입 정의
export type MediaType = "image" | "video";
export type EntityType =
  | "profile"
  | "pt-record"
  | "exercise"
  | "chat"
  | "review";
export type ImageVariant =
  | "public"
  | "thumbnail"
  | "avatar"
  | "cover"
  | "original"
  | "avatarSM";

// ID 생성 옵션
export interface MediaIdOptions {
  userId: string;
  entityType: EntityType;
  entityId?: string;
  mediaType: MediaType;
  timestamp?: boolean;
}

// 계층적 미디어 ID 생성 (커스텀 ID)
export function generateMediaId(options: MediaIdOptions): string {
  const parts: string[] = [options.userId, options.entityType];

  if (options.entityId) {
    parts.push(options.entityId);
  }

  // 타임스탬프 추가 (중복 방지)
  if (options.timestamp) {
    parts.push(Date.now().toString());
  }

  // 미디어 타입 접미사
  const suffix = options.mediaType === "image" ? "img" : "vid";
  parts.push(suffix);

  // 슬래시로 구분된 계층 구조
  return parts.join("/");
}

// TUS 업로드를 위한 메타데이터 인코딩
export function encodeMetadata(data: Record<string, unknown>): string {
  const encoded: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;

    // boolean 값은 키만 추가
    if (typeof value === "boolean" && value) {
      encoded.push(key);
    } else {
      // 모든 값을 Base64 인코딩
      const base64Value = Buffer.from(String(value)).toString("base64");
      encoded.push(`${key} ${base64Value}`);
    }
  }

  return encoded.join(",");
}

// Cloudflare Images 최적화 URL 생성
export function getOptimizedImageUrl(
  imageId: string,
  variant: ImageVariant = "public"
): string {
  const accountHash = CLOUDFLARE_ACCOUNT_HASH || "4qM0nUySNuH-4XE1BufwsQ";

  if (!accountHash) {
    console.warn("CLOUDFLARE_ACCOUNT_HASH is not set");
    return "";
  }

  return `${CLOUDFLARE_IMAGES_DELIVERY_URL}/${accountHash}/${imageId}/${variant}`;
}

// Cloudflare Images Public URL 생성 (간편 버전)
export function getCloudflareImageUrl(
  imageId: string,
  variant?: ImageVariant
): string {
  const accountHash = CLOUDFLARE_ACCOUNT_HASH || "4qM0nUySNuH-4XE1BufwsQ";
  const selectedVariant = variant || "public";

  return `https://imagedelivery.net/${accountHash}/${imageId}/${selectedVariant}`;
}

// 파일 크기 포맷팅
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// 비디오 duration 포맷팅 (초 -> mm:ss)
export function formatVideoDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

// 이미지 파일 검증
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "JPG, PNG, WebP, GIF 형식만 지원됩니다.",
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: "파일 크기는 10MB 이하여야 합니다.",
    };
  }

  return { valid: true };
}

// 비디오 파일 검증
export function validateVideoFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const allowedTypes = ["video/mp4", "video/webm", "video/quicktime"];
  const maxSize = 5 * 1024 * 1024 * 1024; // 5GB

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "MP4, WebM, MOV 형식만 지원됩니다.",
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: "파일 크기는 5GB 이하여야 합니다.",
    };
  }

  return { valid: true };
}

// 썸네일 타임스탬프 계산 (백분율)
export function calculateThumbnailTimestamp(
  currentTime: number,
  totalDuration: number
): number {
  if (totalDuration === 0) return 0;
  return Math.min(Math.max(currentTime / totalDuration, 0), 1);
}

// 이미지 미리보기 URL 생성 (File 객체)
export function createImagePreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

// 미리보기 URL 해제
export function revokeImagePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}

// 업로드 진행률 계산
export function calculateUploadProgress(loaded: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((loaded / total) * 100);
}

// 에러 메시지 파싱 (Cloudflare API 용)
export function parseCloudflareError(error: unknown): string {
  if (typeof error === "string") return error;

  if (typeof error === "object" && error !== null && "errors" in error) {
    const err = error as { errors?: Array<{ message: string }> };
    if (err.errors && err.errors.length > 0) {
      return err.errors.map((e) => e.message).join(", ");
    }
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return "알 수 없는 오류가 발생했습니다.";
}

// 메타데이터 정규화
export function normalizeMetadata(
  metadata: Record<string, unknown>
): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined || value === null) continue;

    // 모든 값을 문자열로 변환
    normalized[key] = String(value);
  }

  return normalized;
}
