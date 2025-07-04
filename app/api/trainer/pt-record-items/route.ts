// app/api/trainer/pt-record-items/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

// PT Record Items 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ptRecordId, type, title, description, entry } = body;

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
