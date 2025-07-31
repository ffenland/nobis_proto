import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { generateMediaId } from "@/app/lib/utils/media.utils";
import { createImageUploadUrl } from "@/app/lib/services/media/image.service";
import { createVideoUploadUrl } from "@/app/lib/services/media/stream.service";
import prisma from "@/app/lib/prisma";

// 미디어 업로드 URL 생성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.role !== "TRAINER") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id: ptRecordId, itemId: ptRecordItemId } = await params;
    const body = await request.json();
    const { mediaType } = body; // "image" or "video"

    // PT Record Item 확인
    const ptRecordItem = await prisma.ptRecordItem.findUnique({
      where: { id: ptRecordItemId },
      select: {
        id: true,
        ptRecord: {
          select: {
            pt: {
              select: {
                trainerId: true,
              },
            },
          },
        },
      },
    });

    if (!ptRecordItem) {
      return NextResponse.json(
        { error: "PT Record Item not found" },
        { status: 404 }
      );
    }

    // 권한 확인 (해당 PT의 트레이너인지)
    const trainer = await prisma.trainer.findUnique({
      where: { userId: session.id },
      select: { id: true },
    });

    if (!trainer || trainer.id !== ptRecordItem.ptRecord.pt.trainerId) {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    // 미디어 ID 생성
    const customId = generateMediaId({
      userId: session.id,
      entityType: "pt-record",
      entityId: ptRecordItemId,
      mediaType: mediaType,
      timestamp: true,
    });

    // 업로드 URL 생성
    if (mediaType === "image") {
      const result = await createImageUploadUrl({
        customId,
        metadata: {
          userId: session.id,
          userRole: session.role,
          entityType: "pt-record",
          entityId: ptRecordItemId,
          uploadedAt: new Date().toISOString(),
        },
        expiry: new Date(Date.now() + 30 * 60 * 1000), // 30분
      });

      return NextResponse.json({
        uploadURL: result.uploadURL,
        customId: result.customId,
        mediaType: "image",
      });
    } else if (mediaType === "video") {
      const result = await createVideoUploadUrl({
        customId,
        metadata: {
          userId: session.id,
          userRole: session.role,
          entityType: "pt-record",
          entityId: ptRecordItemId,
          uploadedAt: new Date().toISOString(),
        },
        maxDurationSeconds: 60, // 1분 제한
      });

      return NextResponse.json({
        uploadURL: result.uploadURL,
        uid: result.uid,
        mediaType: "video",
      });
    } else {
      return NextResponse.json(
        { error: "Invalid media type" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("미디어 업로드 URL 생성 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 미디어 업로드 확인 및 DB 저장
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.role !== "TRAINER") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { itemId: ptRecordItemId } = await params;
    const body = await request.json();
    const { mediaType, cloudflareId, streamId, originalName, mimeType, size, duration } = body;

    // PT Record Item 확인
    const ptRecordItem = await prisma.ptRecordItem.findUnique({
      where: { id: ptRecordItemId },
      select: {
        id: true,
        ptRecord: {
          select: {
            pt: {
              select: {
                trainerId: true,
              },
            },
          },
        },
      },
    });

    if (!ptRecordItem) {
      return NextResponse.json(
        { error: "PT Record Item not found" },
        { status: 404 }
      );
    }

    // 권한 확인
    const trainer = await prisma.trainer.findUnique({
      where: { userId: session.id },
      select: { id: true },
    });

    if (!trainer || trainer.id !== ptRecordItem.ptRecord.pt.trainerId) {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    // 미디어 DB 저장
    if (mediaType === "image") {
      const image = await prisma.image.create({
        data: {
          cloudflareId,
          originalName,
          mimeType,
          size,
          type: "PT_RECORD",
          uploadedById: session.id,
          ptRecordItemId,
        },
      });

      return NextResponse.json({ id: image.id, type: "image" });
    } else if (mediaType === "video") {
      const video = await prisma.video.create({
        data: {
          streamId,
          originalName,
          mimeType,
          size,
          duration: duration || 0,
          type: "PT_RECORD",
          status: "READY", // 즉시 사용 가능하도록 READY 상태로 설정
          uploadedById: session.id,
          ptRecordItemId,
        },
      });

      return NextResponse.json({ id: video.id, type: "video" });
    } else {
      return NextResponse.json(
        { error: "Invalid media type" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("미디어 저장 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}