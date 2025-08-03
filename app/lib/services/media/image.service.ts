// app/lib/services/media/image.service.ts

// Cloudflare API 설정
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_IMAGES_TOKEN!;
const CLOUDFLARE_IMAGES_API_BASE = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images`;

// 타입 정의
export interface CreateImageUploadUrlParams {
  customId?: string;
  metadata?: Record<string, string>;
  requireSignedURLs?: boolean;
  expiry?: Date;
}

export interface ImageUploadResponse {
  id: string;
  customId: string;
  uploadURL: string;
  success: boolean;
}

export interface ImageInfo {
  id: string;
  filename: string;
  uploaded: Date;
  requireSignedURLs: boolean;
  variants: string[];
  meta?: Record<string, unknown>;
  draft: boolean;
}

export interface CloudflareImageResponse {
  result: {
    id: string;
    filename: string;
    uploaded: string;
    requireSignedURLs: boolean;
    variants: string[];
    meta?: Record<string, unknown>;
    draft: boolean;
  };
  success: boolean;
  errors: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  messages: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface CloudflareUploadResponse {
  result: {
    id: string;
    uploadURL: string;
  };
  success: boolean;
  errors: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  messages: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// Direct Upload URL 생성
export async function createImageUploadUrl(
  params: CreateImageUploadUrlParams
): Promise<ImageUploadResponse> {
  const formData = new FormData();

  if (params.customId) {
    formData.append("id", params.customId);
  }

  if (params.metadata) {
    formData.append("metadata", JSON.stringify(params.metadata));
  }

  if (params.requireSignedURLs !== undefined) {
    formData.append("requireSignedURLs", params.requireSignedURLs.toString());
  }

  if (params.expiry) {
    // Cloudflare expects RFC3339 format
    formData.append("expiry", params.expiry.toISOString());
  }

  try {
    const response = await fetch(
      `${CLOUDFLARE_IMAGES_API_BASE}/v2/direct_upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloudflare API error: ${response.status} - ${error}`);
    }

    const data: CloudflareUploadResponse = await response.json();

    if (!data.success) {
      throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
    }

    return {
      id: data.result.id,
      customId: data.result.id,
      uploadURL: data.result.uploadURL,
      success: true,
    };
  } catch (error) {
    console.error("Failed to create image upload URL:", error);
    throw error;
  }
}

// 이미지 정보 조회
export async function getImageInfo(imageId: string): Promise<ImageInfo | null> {
  try {
    const response = await fetch(
      `${CLOUDFLARE_IMAGES_API_BASE}/v1/${imageId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        },
      }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloudflare API error: ${response.status} - ${error}`);
    }

    const data: CloudflareImageResponse = await response.json();

    if (!data.success) {
      throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
    }

    return {
      id: data.result.id,
      filename: data.result.filename,
      uploaded: new Date(data.result.uploaded),
      requireSignedURLs: data.result.requireSignedURLs,
      variants: data.result.variants,
      meta: data.result.meta,
      draft: data.result.draft,
    };
  } catch (error) {
    console.error("Failed to get image info:", error);
    throw error;
  }
}

// 이미지 삭제
export async function deleteImage(imageId: string): Promise<void> {
  try {
    // imageId에 슬래시가 포함된 경우를 위해 encodeURIComponent 사용
    const encodedImageId = encodeURIComponent(imageId);
    const response = await fetch(
      `${CLOUDFLARE_IMAGES_API_BASE}/v1/${encodedImageId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloudflare API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
    }
  } catch (error) {
    console.error("Failed to delete image:", error);
    throw error;
  }
}

// 이미지 목록 조회
export async function listImages(params?: {
  page?: number;
  perPage?: number;
}): Promise<{
  images: ImageInfo[];
  total: number;
}> {
  const queryParams = new URLSearchParams();

  if (params?.page) {
    queryParams.append("page", params.page.toString());
  }

  if (params?.perPage) {
    queryParams.append("per_page", params.perPage.toString());
  }

  try {
    const response = await fetch(
      `${CLOUDFLARE_IMAGES_API_BASE}/v1?${queryParams.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloudflare API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
    }

    return {
      images: data.result.images.map((img: any) => ({
         
        id: img.id,
        filename: img.filename,
        uploaded: new Date(img.uploaded),
        requireSignedURLs: img.requireSignedURLs,
        variants: img.variants,
        meta: img.meta,
        draft: img.draft,
      })),
      total: data.result.total,
    };
  } catch (error) {
    console.error("Failed to list images:", error);
    throw error;
  }
}

// 타입 추론을 위한 export
export type ImageUploadResult = Awaited<
  ReturnType<typeof createImageUploadUrl>
>;
export type ImageInfoResult = Awaited<ReturnType<typeof getImageInfo>>;
export type ImageListResult = Awaited<ReturnType<typeof listImages>>;
