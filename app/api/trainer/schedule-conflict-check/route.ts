// app/api/trainer/schedule-conflict-check/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import {
  checkPtApplicationConflict,
  type IScheduleConflictCheckRequest,
} from "@/app/lib/services/schedule-conflict.service";
import prisma from "@/app/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "TRAINER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body: IScheduleConflictCheckRequest = await request.json();
    const { ptId } = body;

    if (!ptId) {
      return NextResponse.json(
        { error: "PT ID가 필요합니다." },
        { status: 400 }
      );
    }

    // PT가 해당 트레이너의 것인지 확인 (select 사용)
    const pt = await prisma.pt.findFirst({
      where: {
        id: ptId,
        trainerId: session.roleId,
        state: "PENDING",
      },
      select: { id: true },
    });

    if (!pt) {
      return NextResponse.json(
        { error: "해당 PT 신청을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 스케줄 충돌 체크 실행
    const conflictResult = await checkPtApplicationConflict(ptId);

    return NextResponse.json({
      success: true,
      hasConflict: conflictResult.hasConflict,
      conflictingMembers: conflictResult.conflictingMembers,
    });
  } catch (error) {
    console.error("스케줄 충돌 체크 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
