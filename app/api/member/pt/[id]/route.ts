// app/api/member/pt/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import { getPtDetailForMemberService } from "@/app/lib/services/pt-detail.service";
import {
  deletePendingPtService,
  canDeletePtService,
} from "@/app/lib/services/pt-delete.service";

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
// DELETE - PENDING 상태 PT 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // 삭제 가능 여부 확인
    const canDelete = await canDeletePtService({
      ptId,
      memberId: session.roleId,
    });

    if (!canDelete) {
      return NextResponse.json(
        {
          error:
            "삭제할 수 없는 PT입니다. PENDING 상태이고 트레이너 승인 전인 PT만 삭제 가능합니다.",
        },
        { status: 400 }
      );
    }

    // PT 삭제 실행
    await deletePendingPtService({
      ptId,
      memberId: session.roleId,
    });

    return NextResponse.json({
      message: "PT가 성공적으로 삭제되었습니다.",
    });
  } catch (error) {
    console.error("PT 삭제 실패:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("찾을 수 없습니다") ||
        error.message.includes("접근 권한") ||
        error.message.includes("삭제할 수 없습니다")
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
