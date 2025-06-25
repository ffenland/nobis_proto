// app/api/media/upload/image/direct/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import { DirectUploadService } from "@/app/lib/services/cloudflare-direct.service";
import { PhotoType } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    const { photoType, entityId } = await request.json();

    if (!photoType || !Object.values(PhotoType).includes(photoType)) {
      return NextResponse.json(
        { error: "유효한 사진 타입이 필요합니다." },
        { status: 400 }
      );
    }

    // 권한 확인 로직 (기존과 동일)
    // ...

    const directUploadService = DirectUploadService.getInstance();

    const uploadData = await directUploadService.createImageUploadUrl(
      session.id,
      photoType
    );

    return NextResponse.json({
      success: true,
      uploadUrl: uploadData.uploadUrl,
      imageId: uploadData.imageId,
      publicUrl: uploadData.publicUrl,
    });
  } catch (error) {
    console.error("Direct upload URL 생성 실패:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류" },
      { status: 500 }
    );
  }
}
