// app/api/trainer/pt-records/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPtRecordDetailService } from "@/app/lib/services/trainer/pt-record.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ptRecord = await getPtRecordDetailService(id);
    return NextResponse.json(ptRecord);
  } catch (error) {
    console.error("PT Record 조회 실패:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "서버 오류가 발생했습니다.",
      },
      { status: error instanceof Error ? 404 : 500 }
    );
  }
}
