// app/api/manager/members/[memberId]/route.ts

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

    // 서비스 호출
    const memberManagementService = MemberManagementService.getInstance();
    const memberDetail = await memberManagementService.getMemberDetail({
      memberId,
    });

    return NextResponse.json({
      member: memberDetail,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Manager Member Detail API] Error:", error);

    if (
      error instanceof Error &&
      error.message === "회원을 찾을 수 없습니다."
    ) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
