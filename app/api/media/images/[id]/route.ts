// app/api/media/images/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import {
  deleteImage,
  type UserSession,
} from "@/app/services/media/media.service";

type Params = Promise<{ id: string }>;

// 이미지 조회 기능은 현재 사용되지 않으므로 GET 엔드포인트 제거
// 필요시 새로운 서비스에 조회 기능 추가 가능

// 이미지 삭제
export async function DELETE(request: NextRequest, props: { params: Params }) {
  try {
    const params = await props.params;
    const { id } = params;

    // 세션 확인
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // UserSession 구성
    const userSession: UserSession = {
      id: session.id,
      role: session.role as "TRAINER" | "MEMBER" | "MANAGER",
      roleId: session.roleId,
    };

    // 서비스 로직 호출
    const result = await deleteImage(id, userSession);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to delete image:", error);
    
    // 에러 메시지에 따른 HTTP 상태 코드 결정
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    if (errorMessage.includes("Image not found")) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }
    
    if (errorMessage.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized to delete this image" }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
