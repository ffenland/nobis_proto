// app/api/media/list/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getMediaList, isValidEntityType } from "@/app/lib/services/media/media-list.service";
import type { EntityType } from "@/app/lib/utils/media.utils";

export async function GET(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId") || undefined;

    // entityType 검증
    if (!entityType || !isValidEntityType(entityType)) {
      return NextResponse.json(
        { error: "Invalid entity type" },
        { status: 400 }
      );
    }

    // 서비스 함수 호출로 미디어 목록 가져오기
    const mediaItems = await getMediaList({
      userId: session.id,
      userRole: session.role,
      entityType: entityType as EntityType,
      entityId,
    });

    return NextResponse.json(mediaItems);
  } catch (error) {
    console.error("Failed to fetch media list:", error);
    return NextResponse.json(
      { error: "Failed to fetch media list" },
      { status: 500 }
    );
  }
}
