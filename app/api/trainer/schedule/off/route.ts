// app/api/trainer/schedule/off/route.ts
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { createTrainerOff } from "@/app/services/trainer/schedule.service";

export async function POST(request: NextRequest) {
  try {
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    // 트레이너 권한 확인
    if (sessionOrResponse.role !== "TRAINER") {
      return NextResponse.json(
        { error: "트레이너 권한이 필요합니다." },
        { status: 403 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { date, offType } = body;

    // 필수 필드 검증
    if (!date || !offType) {
      return NextResponse.json(
        { error: "날짜와 휴무 유형은 필수입니다." },
        { status: 400 }
      );
    }

    // 휴무 유형 검증
    if (!["FULL_DAY", "MORNING", "AFTERNOON"].includes(offType)) {
      return NextResponse.json(
        { error: "올바르지 않은 휴무 유형입니다." },
        { status: 400 }
      );
    }

    // 서비스 함수 호출
    const trainerOff = await createTrainerOff({
      trainerId: sessionOrResponse.roleId,
      date,
      offType,
    });

    return NextResponse.json(trainerOff);
  } catch (error) {
    console.error("TrainerOff creation error:", error);

    // createTrainerOff에서 던진 충돌 에러는 409 상태로 반환
    if (error instanceof Error && error.message.includes("PT 수업")) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}