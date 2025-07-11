import { NextRequest, NextResponse } from "next/server";
import { preschedulePtService } from "@/app/lib/services/pt-apply.service";
import { getSession } from "@/app/lib/session";

export async function POST(request: NextRequest) {
  try {
    // 세션 확인
    const session = await getSession();
    console.log(session, "SESSION");
    if (!session || !session.roleId || session.role !== "MEMBER") {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // 요청 데이터 파싱
    const body = await request.json();
    const { chosenSchedule, centerId, ptProductId, pattern, trainerId } = body;
    
    // 디버깅용 로그
    console.log("=== preschedule 요청 데이터 ===");
    console.log("chosenSchedule:", JSON.stringify(chosenSchedule, null, 2));
    console.log("pattern:", pattern);

    // 필수 데이터 검증
    if (
      !chosenSchedule ||
      !centerId ||
      !ptProductId ||
      !pattern ||
      !trainerId
    ) {
      return NextResponse.json(
        { error: "필수 데이터가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 서비스 호출
    const result = await preschedulePtService({
      memberId: session.roleId,
      chosenSchedule,
      centerId,
      ptProductId,
      pattern,
      trainerId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("PT 사전 스케줄링 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
