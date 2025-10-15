// app/api/media/videos/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { logApiError } from "@/app/services/error/error-logging.service";
import { deleteVideo } from "@/app/services/media/media.service";
import { getVideoInfo } from "@/app/services/media/cloudflare.service";

type Params = Promise<{ id: string }>;

// 비디오 정보 조회
export async function GET(request: NextRequest, props: { params: Params }) {
  // 1. 세션 확인 (필수)
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 2. 비즈니스 로직 (try-catch 내부)
  try {
    const params = await props.params;
    const { id: streamId } = params;

    // Cloudflare에서 비디오 정보 조회
    const videoInfo = await getVideoInfo(streamId);

    if (!videoInfo) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    return NextResponse.json(videoInfo);
  } catch (error) {
    // 3. 에러 로깅 (필수)
    await logApiError(request, error as Error, {
      errorCode: "MEDIA_VIDEO_GET_001",
      userId: sessionOrResponse.id,
      metadata: { action: "getVideoInfo" },
      tags: ["media", "video", "get"],
    });

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("404")) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to get video info" },
      { status: 500 }
    );
  }
}

// 비디오 삭제
export async function DELETE(request: NextRequest, props: { params: Params }) {
  // 1. 세션 확인 (필수)
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 2. 비즈니스 로직 (try-catch 내부)
  try {
    const params = await props.params;
    const { id } = params;

    // 서비스 로직 호출
    const result = await deleteVideo(id, sessionOrResponse);

    return NextResponse.json(result);
  } catch (error) {
    // 3. 에러 로깅 (필수)
    await logApiError(request, error as Error, {
      errorCode: "MEDIA_VIDEO_DELETE_001",
      userId: sessionOrResponse.id,
      metadata: { action: "deleteVideo" },
      tags: ["media", "video", "delete"],
    });

    // 에러 메시지에 따른 HTTP 상태 코드 결정
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("Video not found")) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    if (errorMessage.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized to delete this video" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Failed to delete video" },
      { status: 500 }
    );
  }
}
