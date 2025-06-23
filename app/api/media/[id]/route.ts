// app/api/media/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import prisma from "@/app/lib/prisma";
import {
  ImageUploadService,
  VideoUploadService,
} from "@/app/lib/services/upload.service";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionOrRedirect();
    const mediaId = params.id;

    const media = await prisma.media.findUnique({
      where: { id: mediaId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            username: true,
            avatarMedia: {
              select: {
                publicUrl: true,
                thumbnailUrl: true,
              },
            },
          },
        },
      },
    });

    if (!media) {
      return NextResponse.json(
        { error: "미디어를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 권한 확인 (본인 또는 관리자만 조회 가능)
    if (media.uploadedById !== session.id && session.role !== "MANAGER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    return NextResponse.json({ media });
  } catch (error) {
    console.error("Media fetch error:", error);
    return NextResponse.json(
      { error: "조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionOrRedirect();
    const mediaId = params.id;

    const media = await prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      return NextResponse.json(
        { error: "미디어를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 권한 확인
    if (media.uploadedById !== session.id && session.role !== "MANAGER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    // 클라우드에서 삭제
    if (media.streamId) {
      const videoService = VideoUploadService.getInstance();
      await videoService.deleteVideo(media.streamId);
    } else if (media.r2Key) {
      const imageService = ImageUploadService.getInstance();
      await imageService.deleteImage(media.r2Key);
    }

    // DB에서 삭제 상태로 변경
    await prisma.media.update({
      where: { id: mediaId },
      data: {
        status: "DELETED",
        scheduledDeleteAt: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Media deletion error:", error);
    return NextResponse.json(
      { error: "삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
