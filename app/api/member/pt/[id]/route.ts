// app/api/member/pt/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import { getPtDetailForMemberService } from "@/app/lib/services/pt-detail.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "MEMBER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id: ptId } = await params;

    if (!ptId) {
      return NextResponse.json(
        { error: "PT ID가 필요합니다." },
        { status: 400 }
      );
    }

    const ptDetail = await getPtDetailForMemberService(ptId, session.roleId);
    return NextResponse.json(ptDetail);
  } catch (error) {
    console.error("PT Detail 조회 실패:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("찾을 수 없습니다") ||
        error.message.includes("접근 권한")
      ) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
