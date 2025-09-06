// app/api/media/videos/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import {
  getVideoInfoWithAuth,
  deleteVideoWithAuth,
} from "@/app/lib/services/media/video.service";

type Params = Promise<{ id: string }>;

// 비디오 정보 조회
export async function GET(request: NextRequest, props: { params: Params }) {
  try {
    const params = await props.params;
    const { id } = params;

    // 세션 확인
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 비디오 정보 조회 (권한 확인 포함)
    const videoInfo = await getVideoInfoWithAuth(id, session.id, session.role);

    if (!videoInfo) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    return NextResponse.json(videoInfo);
  } catch (error) {
    console.error("Failed to get video info:", error);
    
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: "Failed to get video info" },
      { status: 500 }
    );
  }
}

// 비디오 삭제
export async function DELETE(request: NextRequest, props: { params: Params }) {
  try {
    const params = await props.params;
    const { id } = params;

    // 세션 확인
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 비디오 삭제 (권한 확인 및 DB 처리 포함)
    const result = await deleteVideoWithAuth(id, session.id, session.role);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to delete video:", error);
    
    if (error instanceof Error && error.message === "Video not found") {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }
    
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: "Failed to delete video" },
      { status: 500 }
    );
  }
}
