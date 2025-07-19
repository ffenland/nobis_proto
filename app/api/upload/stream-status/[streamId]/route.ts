// app/api/upload/stream-status/[streamId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { CloudflareStreamService } from "@/app/lib/services/cloudflare-direct.service";

export async function GET(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  try {
    // 세션 확인
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const { streamId } = params;

    if (!streamId) {
      return NextResponse.json(
        { error: "streamId가 필요합니다." },
        { status: 400 }
      );
    }

    // Cloudflare Stream 상태 확인
    const streamService = CloudflareStreamService.getInstance();
    const stream = await streamService.getVideoDetails(streamId);

    return NextResponse.json({
      success: true,
      streamId,
      status: stream.status?.state || "unknown", // "inprogress", "ready", "error"
      readyToStream: stream.readyToStream || false,
      duration: stream.duration || null,
      preview: stream.preview || null,
      thumbnail: stream.thumbnail || null,
      meta: stream.meta || {},
      created: stream.created || null,
      modified: stream.modified || null,
    });

  } catch (error) {
    console.error("Stream 상태 확인 오류:", error);
    
    return NextResponse.json(
      { 
        error: "Stream 상태 확인에 실패했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류"
      },
      { status: 500 }
    );
  }
}