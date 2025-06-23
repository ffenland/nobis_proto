// app/api/media/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import {
  MediaService,
  type MediaFilter,
} from "@/app/lib/services/media.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type") as "image" | "video" | null;
    const entityId = searchParams.get("entityId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const filter: MediaFilter = {
      uploadedById: session.id,
      status: "ACTIVE",
    };

    if (type) {
      filter.type = type;
    }

    if (entityId) {
      filter.entityId = entityId;
    }

    const mediaService = MediaService.getInstance();
    const result = await mediaService.getMediaList({
      filter,
      pagination: { page, limit },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Media list error:", error);
    return NextResponse.json(
      { error: "목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
