import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { getPtRecordItemsService } from "@/app/lib/services/pt-record.service";
import { getSession } from "@/app/lib/session";

// PT Record Items 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const ptRecordItems = await getPtRecordItemsService(id);
    return NextResponse.json(ptRecordItems);
  } catch (error) {
    console.error("PT Record Items 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PT Record Item 생성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: ptRecordId } = await params;
    const body = await request.json();
    const { type, title, description, entry } = body;

    const ptRecordItem = await prisma.ptRecordItem.create({
      data: {
        ptRecordId,
        type,
        title,
        description,
        entry: entry || 0,
      },
    });

    return NextResponse.json(ptRecordItem);
  } catch (error) {
    console.error("PT Record Item 생성 실패:", error);
    return NextResponse.json(
      { error: "PT Record Item 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}