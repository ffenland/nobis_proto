import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getTrainersForCenterAssignment } from "@/app/lib/services/manager/manager-trainer.service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ centerId: string }> }
) {
  try {
    // 세션 확인
    const session = await getSession();
    if (!session || session.role !== "MANAGER") {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    const { centerId } = await context.params;
    
    // 서비스 함수 호출
    const data = await getTrainersForCenterAssignment(centerId);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("트레이너 배정 정보 조회 오류:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "트레이너 배정 정보를 조회하는 중 오류가 발생했습니다." 
      },
      { status: 500 }
    );
  }
}