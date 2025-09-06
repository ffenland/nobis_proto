// app/lib/services/media/video.service.ts

// Cloudflare API 설정
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const CLOUDFLARE_API_TOKEN =
  process.env.CLOUDFLARE_STREAM_TOKEN || process.env.CLOUDFLARE_API_TOKEN!;
const CLOUDFLARE_STREAM_API_BASE = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`;

// 타입 정의
export interface CreateVideoUploadUrlParams {
  customId?: string;
  creator?: string;
  metadata?: Record<string, string>;
  maxDurationSeconds?: number;
  expiry?: Date;
  allowedOrigins?: string[];
  requireSignedURLs?: boolean;
  thumbnailTimestampPct?: number;
  watermark?: string;
  scheduledDeletion?: Date;
}

export interface VideoUploadResponse {
  uid: string;
  uploadURL: string;
  success: boolean;
}

export interface VideoInfo {
  uid: string;
  creator?: string;
  created: Date;
  modified: Date;
  duration?: number;
  size?: number;
  thumbnail?: string;
  thumbnailTimestampPct?: number;
  readyToStream: boolean;
  status?: {
    state: "inprogress" | "ready" | "error";
    pctComplete?: number;
    errorReasonCode?: string;
    errorReasonText?: string;
  };
  meta?: Record<string, unknown>;
  playback?: {
    hls: string;
    dash: string;
  };
  watermark?: {
    uid: string;
    size: number;
    height: number;
    width: number;
    created: string;
    downloadedFrom: string;
    name: string;
    opacity: number;
    padding: number;
    scale: number;
    position: string;
  };
}

export interface CloudflareVideoResponse {
  result: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  success: boolean;
  errors: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  messages: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// Direct Upload URL 생성
export async function createVideoUploadUrl(
  params: CreateVideoUploadUrlParams
): Promise<VideoUploadResponse> {
  const body: Record<string, unknown> = {};

  if (params.creator) {
    body.creator = params.creator;
  }

  if (params.metadata) {
    body.meta = params.metadata;
  }

  if (params.maxDurationSeconds !== undefined) {
    body.maxDurationSeconds = params.maxDurationSeconds;
  }

  if (params.expiry) {
    body.expiry = params.expiry.toISOString();
  }

  if (params.allowedOrigins) {
    body.allowedOrigins = params.allowedOrigins;
  }

  if (params.requireSignedURLs !== undefined) {
    body.requireSignedURLs = params.requireSignedURLs;
  }

  if (params.thumbnailTimestampPct !== undefined) {
    body.thumbnailTimestampPct = params.thumbnailTimestampPct;
  }

  if (params.watermark) {
    body.watermark = params.watermark;
  }

  if (params.scheduledDeletion) {
    body.scheduledDeletion = params.scheduledDeletion.toISOString();
  }

  try {
    const response = await fetch(
      `${CLOUDFLARE_STREAM_API_BASE}/direct_upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloudflare API error: ${response.status} - ${error}`);
    }

    const data: CloudflareVideoResponse = await response.json();

    if (!data.success) {
      throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
    }

    return {
      uid: data.result.uid,
      uploadURL: data.result.uploadURL,
      success: true,
    };
  } catch (error) {
    console.error("Failed to create video upload URL:", error);
    throw error;
  }
}

// TUS용 Direct Upload URL 생성 (대용량 파일용)
export async function createVideoTusUploadUrl(
  params: CreateVideoUploadUrlParams
): Promise<{
  uploadURL: string;
  success: boolean;
}> {
  // TUS 업로드는 특별한 엔드포인트 사용
  const tusEndpoint = `${CLOUDFLARE_STREAM_API_BASE}?direct_user=true`;

  // TUS 메타데이터는 Base64 인코딩 필요
  const headers: Record<string, string> = {
    Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
  };

  if (params.creator) {
    headers["Upload-Creator"] = params.creator;
  }

  // Upload-Metadata 헤더 구성
  const uploadMetadata: string[] = [];

  if (params.maxDurationSeconds !== undefined) {
    const encoded = Buffer.from(params.maxDurationSeconds.toString()).toString(
      "base64"
    );
    uploadMetadata.push(`maxdurationseconds ${encoded}`);
  }

  if (params.requireSignedURLs !== undefined) {
    uploadMetadata.push("requiresignedurls");
  }

  if (params.expiry) {
    const encoded = Buffer.from(params.expiry.toISOString()).toString("base64");
    uploadMetadata.push(`expiry ${encoded}`);
  }

  if (uploadMetadata.length > 0) {
    headers["Upload-Metadata"] = uploadMetadata.join(",");
  }

  return {
    uploadURL: tusEndpoint,
    success: true,
  };
}

// 비디오 정보 조회
export async function getVideoInfo(videoId: string): Promise<VideoInfo | null> {
  try {
    const response = await fetch(`${CLOUDFLARE_STREAM_API_BASE}/${videoId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloudflare API error: ${response.status} - ${error}`);
    }

    const data: CloudflareVideoResponse = await response.json();

    if (!data.success) {
      throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
    }

    const video = data.result;

    return {
      uid: video.uid,
      creator: video.creator,
      created: new Date(video.created),
      modified: new Date(video.modified),
      duration: video.duration,
      size: video.size,
      thumbnail: video.thumbnail,
      thumbnailTimestampPct: video.thumbnailTimestampPct,
      readyToStream: video.readyToStream,
      status: video.status,
      meta: video.meta,
      playback: video.playback,
      watermark: video.watermark,
    } as VideoInfo;
  } catch (error) {
    console.error("Failed to get video info:", error);
    throw error;
  }
}

// 비디오 삭제
export async function deleteVideo(videoId: string): Promise<void> {
  try {
    const response = await fetch(`${CLOUDFLARE_STREAM_API_BASE}/${videoId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloudflare API error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(`Cloudflare API error: ${JSON.stringify(data.errors)}`);
    }
  } catch (error) {
    console.error("Failed to delete video:", error);
    throw error;
  }
}

// 비디오 목록 조회
export async function listVideos(params?: {
  creator?: string;
  search?: string;
  limit?: number;
  before?: Date;
  after?: Date;
  includeCounts?: boolean;
}): Promise<{
  videos: VideoInfo[];
  total?: number;
}> {
  const queryParams = new URLSearchParams();

  if (params?.creator) {
    queryParams.append("creator", params.creator);
  }

  if (params?.search) {
    queryParams.append("search", params.search);
  }

  if (params?.limit) {
    queryParams.append("limit", params.limit.toString());
  }

  if (params?.before) {
    queryParams.append("before", params.before.toISOString());
  }

  if (params?.after) {
    queryParams.append("after", params.after.toISOString());
  }

  if (params?.includeCounts) {
    queryParams.append("include_counts", "true");
  }

  try {
    const response = await fetch(
      `${CLOUDFLARE_STREAM_API_BASE}?${queryParams.toString()}`,
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

    const videos = data.result.map((video: any) => ({
      // eslint-disable-line @typescript-eslint/no-explicit-any
      uid: video.uid,
      creator: video.creator,
      created: new Date(video.created),
      modified: new Date(video.modified),
      duration: video.duration,
      size: video.size,
      thumbnail: video.thumbnail,
      thumbnailTimestampPct: video.thumbnailTimestampPct,
      readyToStream: video.readyToStream,
      status: video.status,
      meta: video.meta,
      playback: video.playback,
      watermark: video.watermark,
    }));

    return {
      videos,
      total: data.total,
    };
  } catch (error) {
    console.error("Failed to list videos:", error);
    throw error;
  }
}

// DB 관련 import를 위한 동적 import 사용
async function getPrisma() {
  const { default: prisma } = await import('@/app/lib/prisma');
  return prisma;
}

// 비디오 정보 조회 (권한 확인 포함)
export async function getVideoInfoWithAuth(
  videoId: string,
  userId: string,
  userRole: string
): Promise<VideoInfo | null> {
  // 비디오 정보 조회
  const videoInfo = await getVideoInfo(videoId);
  
  if (!videoInfo) {
    return null;
  }
  
  // 권한 확인 (메타데이터의 userId와 비교)
  if (videoInfo.meta?.userId && videoInfo.meta.userId !== userId) {
    // 관리자는 모든 비디오 조회 가능
    if (userRole !== "MANAGER") {
      throw new Error("Forbidden");
    }
  }
  
  return videoInfo;
}

// 비디오 삭제 (권한 확인 및 DB 처리 포함)
export async function deleteVideoWithAuth(
  id: string,
  userId: string,
  userRole: string
): Promise<{ success: boolean }> {
  const prisma = await getPrisma();
  
  // UUID 형식인지 확인하여 DB ID인지 Cloudflare ID인지 구분
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  
  let videoStreamId: string;
  let dbVideoId: string | null = null;
  
  if (isUUID) {
    // DB에서 비디오 정보 조회
    const dbVideo = await prisma.video.findUnique({
      where: { id },
      select: {
        id: true,
        streamId: true,
        uploadedById: true,
      },
    });
    
    if (!dbVideo) {
      throw new Error("Video not found");
    }
    
    // 권한 확인
    if (dbVideo.uploadedById !== userId && userRole !== "MANAGER") {
      throw new Error("Forbidden");
    }
    
    videoStreamId = dbVideo.streamId;
    dbVideoId = dbVideo.id;
  } else {
    // Cloudflare Stream ID로 직접 처리 (하위 호환성)
    videoStreamId = id;
    
    // 비디오 정보 먼저 조회하여 권한 확인
    const videoInfo = await getVideoInfo(videoStreamId);
    
    if (!videoInfo) {
      throw new Error("Video not found");
    }
    
    // 권한 확인
    if (videoInfo.meta?.userId && videoInfo.meta.userId !== userId) {
      // 관리자는 모든 비디오 삭제 가능
      if (userRole !== "MANAGER") {
        throw new Error("Forbidden");
      }
    }
  }
  
  // Cloudflare에서 먼저 삭제
  try {
    await deleteVideo(videoStreamId);
  } catch (error) {
    // 404 에러는 이미 삭제된 것으로 간주하고 계속 진행
    if (!(error instanceof Error && error.message?.includes("404"))) {
      console.error("Failed to delete from Cloudflare:", error);
      throw new Error("Failed to delete video from Cloudflare");
    }
    console.log("Video already deleted from Cloudflare or not found");
  }
  
  // DB에서도 삭제 (DB ID가 있는 경우)
  if (dbVideoId) {
    await prisma.video.update({
      where: { id: dbVideoId },
      data: { status: "DELETED" },
    });
  }
  
  return { success: true };
}

// 타입 추론을 위한 export
export type VideoUploadResult = Awaited<
  ReturnType<typeof createVideoUploadUrl>
>;
export type VideoInfoResult = Awaited<ReturnType<typeof getVideoInfo>>;
export type VideoListResult = Awaited<ReturnType<typeof listVideos>>;
export type VideoInfoWithAuthResult = Awaited<ReturnType<typeof getVideoInfoWithAuth>>;
export type DeleteVideoWithAuthResult = Awaited<ReturnType<typeof deleteVideoWithAuth>>;
