// app/api/media/images/upload/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { 
  requestImageUpload, 
  type ImageUploadRequest,
  type UserSession 
} from "@/app/services/media/media.service";

export async function POST(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 요청 파싱
    const body: ImageUploadRequest = await request.json();
    const { entityType, entityId, metadata } = body;
    
    // 세션 정보 구성
    const userSession: UserSession = {
      id: session.id,
      role: session.role as "TRAINER" | "MEMBER" | "MANAGER",
      roleId: session.roleId,
    };

    // 서비스 로직 호출
    const result = await requestImageUpload(
      entityType,
      entityId || null,
      userSession,
      metadata
    );
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Image upload URL creation failed:", error);
    
    // 에러 메시지에 따른 HTTP 상태 코드 결정
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // 권한 에러 (validateImageUploadPermission에서 발생)
    if (errorMessage.includes("Only") && errorMessage.includes("can upload")) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }
    
    // Cloudflare API 에러
    if (errorMessage.includes("Cloudflare Images API error")) {
      return NextResponse.json({ error: errorMessage }, { status: 502 });
    }
    
    // 일반적인 권한 에러
    if (errorMessage.includes("Unauthorized") || errorMessage.includes("Forbidden")) {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: "Failed to create upload URL" },
      { status: 500 }
    );
  }
}
