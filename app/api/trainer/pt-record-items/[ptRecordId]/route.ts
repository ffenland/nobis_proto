// app/api/trainer/pt-record-items/[ptRecordId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPtRecordItemsService } from "@/app/lib/services/pt-record.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ptRecordId: string }> }
) {
  try {
    const { ptRecordId } = await params;
    const ptRecordItems = await getPtRecordItemsService(ptRecordId);
    return NextResponse.json(ptRecordItems);
  } catch (error) {
    console.error("PT Record Items 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
