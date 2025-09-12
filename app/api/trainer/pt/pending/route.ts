// app/api/trainer/pt/pending/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { 
  getTrainerPendingPts,
  rejectPt,
  createLessonWithPtApproval 
} from "@/app/services/trainer/pt.service";

export async function GET() {
  try {
    // 세션 확인
    const session = await getSession();
    if (!session || session.role !== "TRAINER") {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    // Pending PT 목록 조회
    const pendingPts = await getTrainerPendingPts(session.roleId);

    return NextResponse.json(pendingPts);
  } catch (error) {
    console.error("Pending PT 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "Pending PT 목록을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}

// PATCH: PT 승인/거절 처리
export async function PATCH(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getSession();
    if (!session || session.role !== "TRAINER") {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ptId, action, reason, lessonData } = body;

    // 필수 필드 검증
    if (!ptId || !action) {
      return NextResponse.json(
        { error: "ptId와 action은 필수입니다." },
        { status: 400 }
      );
    }

    if (!['reject', 'approveWithLesson'].includes(action)) {
      return NextResponse.json(
        { error: "action은 'reject' 또는 'approveWithLesson'이어야 합니다." },
        { status: 400 }
      );
    }

    // 거절 시 reason 필수
    if (action === 'reject' && (!reason || reason.trim().length === 0)) {
      return NextResponse.json(
        { error: "거절 시 사유는 필수입니다." },
        { status: 400 }
      );
    }

    // 레슨과 함께 승인 시 lessonData 필수
    if (action === 'approveWithLesson' && !lessonData) {
      return NextResponse.json(
        { error: "레슨 데이터가 필요합니다." },
        { status: 400 }
      );
    }

    if (action === 'approveWithLesson') {
      const { scheduledAt, endAt, memo } = lessonData;
      if (!scheduledAt || !endAt) {
        return NextResponse.json(
          { error: "레슨 일정과 종료 시간은 필수입니다." },
          { status: 400 }
        );
      }
    }

    let result;

    if (action === 'approveWithLesson') {
      // PT 승인과 동시에 첫 레슨 생성
      result = await createLessonWithPtApproval(session.roleId, ptId, lessonData);
    } else {
      // PT 거절 처리
      result = await rejectPt(ptId, session.roleId, reason.trim());
    }

    return NextResponse.json({
      success: true,
      action,
      result,
    });
  } catch (error: any) {
    console.error("PT 승인/거절 처리 실패:", error);
    
    // Prisma 에러 처리
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: "해당 PT를 찾을 수 없거나 권한이 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "PT 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
