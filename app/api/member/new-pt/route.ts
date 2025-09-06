import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { applyForPt, type PtApplicationData } from "@/app/services/member/pt/pt.service";

export async function POST(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getSession();
    if (!session || session.role !== "MEMBER") {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    // 요청 데이터 파싱
    const body = await request.json();
    const { centerId, ptProductId, trainerId, startDate, description } = body;

    // 필수 필드 검증
    if (!centerId || !ptProductId || !trainerId || !startDate) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 신청 데이터 구성
    const applicationData: PtApplicationData = {
      centerId,
      ptProductId,
      trainerId,
      startDate: new Date(startDate),
      description: description?.trim() || undefined,
    };

    // PT 신청 처리
    const result = await applyForPt(session.roleId, applicationData);

    return NextResponse.json({
      success: true,
      ptId: result.id,
      message: "PT 신청이 완료되었습니다.",
      data: result,
    });
  } catch (error) {
    console.error("PT 신청 처리 실패:", error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "PT 신청 처리 중 오류가 발생했습니다." 
      },
      { status: 500 }
    );
  }
}