// app/api/manager/members/[memberId]/pt-records/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { MemberManagementService } from "@/app/lib/services/member-management.service";

type Params = Promise<{ memberId: string }>;

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  const params = await segmentData.params;
  const memberId = params.memberId;

  try {
    // 세션 및 권한 확인
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "MANAGER") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 }
      );
    }

    // 쿼리 파라미터 추출
    const { searchParams } = new URL(request.url);
    const ptId = searchParams.get("ptId") || undefined;

    // 서비스 호출
    const memberManagementService = MemberManagementService.getInstance();
    const ptRecords = await memberManagementService.getMemberPtRecords(
      memberId,
      ptId
    );

    return NextResponse.json({
      records: ptRecords,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Manager Member PT Records API] Error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
