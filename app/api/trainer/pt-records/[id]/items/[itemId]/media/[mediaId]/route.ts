// DELETE endpoint for removing media from PT record items
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { deletePtRecordItemMedia } from "@/app/lib/services/trainer/pt-record-item.service";

interface Params {
  params: Promise<{
    id: string;
    itemId: string;
    mediaId: string;
  }>;
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "TRAINER" || !session.roleId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: ptRecordId, itemId, mediaId } = await params;
    const { searchParams } = new URL(request.url);
    const mediaType = searchParams.get("type");

    if (!mediaType || !["image", "video"].includes(mediaType)) {
      return NextResponse.json(
        { error: "Invalid media type" },
        { status: 400 }
      );
    }

    // 서비스 함수 호출
    const result = await deletePtRecordItemMedia({
      ptRecordId,
      itemId,
      mediaId,
      mediaType: mediaType as 'image' | 'video',
      trainerId: session.roleId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error deleting media:", error);
    
    if (error instanceof Error) {
      if (error.message === "PT record item not found or access denied") {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      if (error.message === "Image not found" || error.message === "Video not found") {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes("Failed to delete")) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Failed to delete media" },
      { status: 500 }
    );
  }
}
