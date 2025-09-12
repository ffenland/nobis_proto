// app/api/media/videos/confirm/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import {
  confirmVideoUpload,
  type VideoConfirmRequest,
  type UserSession,
} from "@/app/services/media/media.service";

export async function POST(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 요청 파싱
    const body: VideoConfirmRequest = await request.json();
    const { cloudflareId, entityType, entityId } = body;

    // 세션 정보 구성
    const userSession: UserSession = {
      id: session.id,
      role: session.role as "TRAINER" | "MEMBER" | "MANAGER",
      roleId: session.roleId,
    };

    // 서비스 로직 호출
    const result = await confirmVideoUpload(
      cloudflareId,
      entityType,
      entityId || null,
      userSession
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Video confirmation failed:", error);

    // 에러 메시지에 따른 HTTP 상태 코드 결정
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("Video not found in Cloudflare")) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    if (errorMessage.includes("Unauthorized") || errorMessage.includes("different user")) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    if (errorMessage.includes("Only trainers can upload")) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Failed to confirm video upload" },
      { status: 500 }
    );
  }
}
