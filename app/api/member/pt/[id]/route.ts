// app/api/member/pt/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import { getPtDetailForMemberService } from "@/app/lib/services/pt-detail.service";
import { cancelPtService } from "@/app/lib/services/pt-apply.service";
import prisma from "@/app/lib/prisma";

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
// PATCH - PT 메시지 업데이트
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json();
    const { description } = body;

    // PT 메시지 업데이트
    await prisma.pt.update({
      where: {
        id: ptId,
        memberId: session.roleId, // 본인 PT만 수정 가능
      },
      data: {
        description: description || "",
      },
    });

    return NextResponse.json({
      message: "PT 메시지가 성공적으로 업데이트되었습니다.",
    });
  } catch (error) {
    console.error("PT 메시지 업데이트 실패:", error);

    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

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

    // PT 삭제 실행 (cancelPtService에서 권한 확인도 포함)
    await cancelPtService(ptId, session.roleId);

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
