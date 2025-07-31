import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { assignTrainersToCenter } from "@/app/lib/services/manager/manager-trainer.service";

interface AssignTrainersRequest {
  centerId: string;
  trainerIds: string[];
}

export async function PUT(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getSession();
    if (!session || session.role !== "MANAGER") {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    // 요청 본문 파싱
    const body: AssignTrainersRequest = await request.json();
    
    // 필수 필드 검증
    if (!body.centerId) {
      return NextResponse.json(
        { error: "센터 ID가 필요합니다." },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.trainerIds)) {
      return NextResponse.json(
        { error: "트레이너 ID 목록이 필요합니다." },
        { status: 400 }
      );
    }

    // 서비스 함수 호출
    const result = await assignTrainersToCenter(body.centerId, body.trainerIds);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("트레이너 배정 오류:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "트레이너 배정 중 오류가 발생했습니다." 
      },
      { status: 500 }
    );
  }
}