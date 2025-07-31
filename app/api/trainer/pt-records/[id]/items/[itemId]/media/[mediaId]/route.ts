// DELETE endpoint for removing media from PT record items
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import prisma from "@/app/lib/prisma";

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

    if (session.role !== "TRAINER") {
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

    // Verify ownership through PT record
    const ptRecordItem = await prisma.ptRecordItem.findFirst({
      where: {
        id: itemId,
        ptRecord: {
          id: ptRecordId,
          pt: {
            trainerId: session.roleId,
          },
        },
      },
    });

    if (!ptRecordItem) {
      return NextResponse.json(
        { error: "PT record item not found or access denied" },
        { status: 404 }
      );
    }

    // Delete the media record
    if (mediaType === "image") {
      await prisma.image.delete({
        where: {
          id: mediaId,
          ptRecordItemId: itemId,
        },
      });
    } else {
      await prisma.video.delete({
        where: {
          id: mediaId,
          ptRecordItemId: itemId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting media:", error);
    return NextResponse.json(
      { error: "Failed to delete media" },
      { status: 500 }
    );
  }
}