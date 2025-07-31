// DELETE endpoint for removing media from PT record items
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import prisma from "@/app/lib/prisma";
import { deleteImage as deleteCloudflareImage } from "@/app/lib/services/media/image.service";
import { deleteVideo as deleteCloudflareVideo } from "@/app/lib/services/media/stream.service";

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

    // Get media info with cloudflareId
    if (mediaType === "image") {
      const image = await prisma.image.findUnique({
        where: {
          id: mediaId,
          ptRecordItemId: itemId,
        },
        select: {
          id: true,
          cloudflareId: true,
        },
      });

      if (!image) {
        return NextResponse.json(
          { error: "Image not found" },
          { status: 404 }
        );
      }

      // Delete from Cloudflare first
      try {
        await deleteCloudflareImage(image.cloudflareId);
      } catch (error: any) {
        // 404 에러는 이미 삭제된 것으로 간주하고 계속 진행
        if (!error.message?.includes('404')) {
          console.error('Failed to delete from Cloudflare:', error);
          throw new Error('Failed to delete image from Cloudflare');
        }
        console.log('Image already deleted from Cloudflare or not found');
      }

      // Then delete from DB
      await prisma.image.delete({
        where: {
          id: mediaId,
        },
      });
    } else {
      const video = await prisma.video.findUnique({
        where: {
          id: mediaId,
          ptRecordItemId: itemId,
        },
        select: {
          id: true,
          cloudflareId: true,
        },
      });

      if (!video) {
        return NextResponse.json(
          { error: "Video not found" },
          { status: 404 }
        );
      }

      // Delete from Cloudflare first
      try {
        await deleteCloudflareVideo(video.cloudflareId);
      } catch (error: any) {
        // 404 에러는 이미 삭제된 것으로 간주하고 계속 진행
        if (!error.message?.includes('404')) {
          console.error('Failed to delete from Cloudflare:', error);
          throw new Error('Failed to delete video from Cloudflare');
        }
        console.log('Video already deleted from Cloudflare or not found');
      }

      // Then delete from DB
      await prisma.video.delete({
        where: {
          id: mediaId,
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