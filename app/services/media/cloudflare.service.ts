// app/services/media/cloudflare.service.ts
// Cloudflare Images & Stream API wrapper
// 순수 API 호출만 담당, DB 작업 없음

// 환경 변수
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const CLOUDFLARE_IMAGES_TOKEN = process.env.CLOUDFLARE_IMAGES_TOKEN!;
const CLOUDFLARE_STREAM_TOKEN = process.env.CLOUDFLARE_STREAM_TOKEN || process.env.CLOUDFLARE_API_TOKEN!;
const CLOUDFLARE_IMAGES_API = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images`;
const CLOUDFLARE_STREAM_API = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`;

// ===== 공통 타입 정의 =====

interface ResponseInfo {
  code: number; // minimum: 1000
  message: string;
  documentation_url?: string;
  source?: {
    pointer?: string;
  };
}

interface CloudflareApiResponse<T> {
  result: T;
  success: boolean;
  errors: ResponseInfo[];
  messages: ResponseInfo[];
}

// ===== Images API 타입 =====

interface DirectUploadResult {
  id: string; // maxLength: 32, Image unique identifier
  uploadURL: string; // The URL for unauthenticated upload
}

interface Image {
  id?: string; // maxLength: 32, Image unique identifier
  creator?: string; // maxLength: 1024, Internal user ID
  filename?: string; // maxLength: 255, Image file name
  meta?: unknown; // User modifiable key-value store, max 1024 bytes
  requireSignedURLs?: boolean; // Indicates whether signed token is needed
  uploaded?: string; // format: date-time, When uploaded
  variants?: string[]; // Available variants for an image
}

// ===== 헬퍼 함수 =====

/**
 * Cloudflare 메타데이터 타입 가드
 */
function isValidMetadata(meta: unknown): meta is Record<string, string> {
  return meta !== null && typeof meta === "object" && !Array.isArray(meta);
}

/**
 * 안전한 메타데이터 접근
 */
export function getMetadataValue(meta: unknown, key: string): string | undefined {
  if (isValidMetadata(meta)) {
    const value = meta[key];
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

// ===== Images API =====

/**
 * Cloudflare Images Direct Upload URL 생성
 */
export async function createImageUploadUrl(metadata?: Record<string, string>) {
  const formData = new FormData();
  
  if (metadata) {
    formData.append("metadata", JSON.stringify(metadata));
  }
  
  // 30분 후 만료
  const expiry = new Date(Date.now() + 30 * 60 * 1000);
  formData.append("expiry", expiry.toISOString());
  
  const response = await fetch(`${CLOUDFLARE_IMAGES_API}/v2/direct_upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_IMAGES_TOKEN}`,
    },
    body: formData,
  });
  
  const data: CloudflareApiResponse<DirectUploadResult> = await response.json();
  
  if (!data.success) {
    const errorMessage = data.errors.length > 0 
      ? data.errors.map(e => e.message).join(", ")
      : "Unknown error";
    throw new Error(`Cloudflare Images API error: ${errorMessage}`);
  }
  
  return {
    id: data.result.id,
    uploadURL: data.result.uploadURL,
  };
}

/**
 * Cloudflare Images 정보 조회
 */
export async function getImageInfo(imageId: string) {
  const response = await fetch(`${CLOUDFLARE_IMAGES_API}/v1/${imageId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_IMAGES_TOKEN}`,
    },
  });
  
  if (response.status === 404) {
    return null;
  }
  
  const data: CloudflareApiResponse<Image> = await response.json();
  
  if (!data.success) {
    const errorMessage = data.errors.length > 0 
      ? data.errors.map(e => e.message).join(", ")
      : "Unknown error";
    throw new Error(`Cloudflare Images API error: ${errorMessage}`);
  }
  
  return {
    id: data.result.id!,
    filename: data.result.filename!,
    uploaded: new Date(data.result.uploaded!),
    requireSignedURLs: data.result.requireSignedURLs || false,
    variants: data.result.variants || [],
    meta: data.result.meta,
    draft: false, // Image Details API는 draft 정보 없음
  };
}

/**
 * Cloudflare Images 삭제
 */
export async function deleteImage(imageId: string) {
  const encodedImageId = encodeURIComponent(imageId);
  const response = await fetch(`${CLOUDFLARE_IMAGES_API}/v1/${encodedImageId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_IMAGES_TOKEN}`,
    },
  });
  
  // 404는 이미 삭제된 것으로 간주
  if (response.status === 404) {
    return { success: true, alreadyDeleted: true };
  }
  
  const data: CloudflareApiResponse<unknown> = await response.json();
  
  if (!data.success) {
    const errorMessage = data.errors.length > 0 
      ? data.errors.map(e => e.message).join(", ")
      : "Unknown error";
    throw new Error(`Cloudflare Images API error: ${errorMessage}`);
  }
  
  return { success: true, alreadyDeleted: false };
}


// ===== Stream API =====

/**
 * Cloudflare Stream Direct Upload URL 생성
 */
export async function createVideoUploadUrl(metadata?: Record<string, string>) {
  const body: any = {
    maxDurationSeconds: 600, // 10분 제한
    expiry: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
  
  if (metadata) {
    body.meta = metadata;
  }
  
  const response = await fetch(`${CLOUDFLARE_STREAM_API}/direct_upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_STREAM_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cloudflare Stream API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(`Cloudflare Stream API error: ${JSON.stringify(data.errors)}`);
  }
  
  return {
    uid: data.result.uid,
    uploadURL: data.result.uploadURL,
  };
}

/**
 * Cloudflare Stream TUS Upload 생성 (대용량 파일용)
 */
export async function createVideoTusUpload(
  metadata?: Record<string, string>,
  tusResumable: string = "1.0.0"
) {
  const headers: HeadersInit = {
    Authorization: `Bearer ${CLOUDFLARE_STREAM_TOKEN}`,
    "Tus-Resumable": tusResumable,
    "Upload-Creator": "nobis-proto",
  };
  
  if (metadata) {
    // TUS 메타데이터 형식: key1 base64value1, key2 base64value2
    const tusMetadata = Object.entries(metadata)
      .map(([key, value]) => {
        const base64Value = Buffer.from(value).toString("base64");
        return `${key} ${base64Value}`;
      })
      .join(",");
    headers["Upload-Metadata"] = tusMetadata;
  }
  
  const response = await fetch(CLOUDFLARE_STREAM_API, {
    method: "POST",
    headers,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cloudflare Stream TUS error: ${response.status} - ${error}`);
  }
  
  const location = response.headers.get("location");
  const streamMediaId = response.headers.get("stream-media-id");
  
  if (!location || !streamMediaId) {
    throw new Error("Missing required headers in TUS response");
  }
  
  return {
    uploadURL: location,
    uid: streamMediaId,
  };
}

/**
 * Cloudflare Stream 비디오 정보 조회
 */
export async function getVideoInfo(videoId: string) {
  const response = await fetch(`${CLOUDFLARE_STREAM_API}/${videoId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_STREAM_TOKEN}`,
    },
  });
  
  if (response.status === 404) {
    return null;
  }
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cloudflare Stream API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(`Cloudflare Stream API error: ${JSON.stringify(data.errors)}`);
  }
  
  return {
    uid: data.result.uid,
    thumbnail: data.result.thumbnail,
    thumbnailTimestampPct: data.result.thumbnailTimestampPct,
    readyToStream: data.result.readyToStream,
    status: data.result.status,
    meta: data.result.meta,
    created: new Date(data.result.created),
    modified: new Date(data.result.modified),
    duration: data.result.duration,
    size: data.result.size,
    preview: data.result.preview,
  };
}

/**
 * Cloudflare Stream 비디오 삭제
 */
export async function deleteVideo(videoId: string) {
  const response = await fetch(`${CLOUDFLARE_STREAM_API}/${videoId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_STREAM_TOKEN}`,
    },
  });
  
  // 404는 이미 삭제된 것으로 간주
  if (response.status === 404) {
    return { success: true, alreadyDeleted: true };
  }
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cloudflare Stream API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(`Cloudflare Stream API error: ${JSON.stringify(data.errors)}`);
  }
  
  return { success: true, alreadyDeleted: false };
}

/**
 * Cloudflare Stream 비디오 URL 생성
 */
export function getVideoUrl(videoId: string) {
  const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;
  return `https://customer-${accountHash}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
}

/**
 * Cloudflare Stream 썸네일 URL 생성
 */
export function getVideoThumbnailUrl(videoId: string) {
  const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH;
  return `https://customer-${accountHash}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg`;
}

// 타입 추론
export type CreateImageUploadUrlResult = Awaited<ReturnType<typeof createImageUploadUrl>>;
export type GetImageInfoResult = Awaited<ReturnType<typeof getImageInfo>>;
export type CreateVideoUploadUrlResult = Awaited<ReturnType<typeof createVideoUploadUrl>>;
export type CreateVideoTusUploadResult = Awaited<ReturnType<typeof createVideoTusUpload>>;
export type GetVideoInfoResult = Awaited<ReturnType<typeof getVideoInfo>>;