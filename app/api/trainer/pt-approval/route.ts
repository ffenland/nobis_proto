// app/api/trainer/pt-approval/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import {
  approvePtApplicationService,
  rejectPtApplicationService,
} from "@/app/lib/services/trainer.service";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "TRAINER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const { ptId, action, reason } = body;

    if (!ptId || !action) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    if (action === "approve") {
      const result = await approvePtApplicationService(ptId, session.roleId);
      return NextResponse.json({
        success: true,
        message: "PT 신청이 승인되었습니다.",
        data: result,
      });
    } else if (action === "reject") {
      const result = await rejectPtApplicationService(
        ptId,
        session.roleId,
        reason
      );
      return NextResponse.json({
        success: true,
        message: "PT 신청이 거절되었습니다.",
        data: result,
      });
    } else {
      return NextResponse.json(
        { error: "잘못된 액션입니다." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("PT 승인/거절 처리 실패:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
