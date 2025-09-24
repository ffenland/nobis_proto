// app/api/manager/trainers/off/route.ts
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import {
  getTrainerOffs,
  updateTrainerOffState,
  UpdateTrainerOffStateInput,
} from "@/app/services/manager/manager-trainer.service";

export async function GET() {
  try {
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    // 매니저 권한 확인
    if (sessionOrResponse.role !== "MANAGER") {
      return NextResponse.json(
        { error: "매니저 권한이 필요합니다." },
        { status: 403 }
      );
    }

    // TrainerOff 목록 조회
    const trainerOffs = await getTrainerOffs(sessionOrResponse.roleId);

    return NextResponse.json(trainerOffs);
  } catch (error) {
    console.error("Get trainer offs API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    // 매니저 권한 확인
    if (sessionOrResponse.role !== "MANAGER") {
      return NextResponse.json(
        { error: "매니저 권한이 필요합니다." },
        { status: 403 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { id, state }: UpdateTrainerOffStateInput = body;

    // 필수 필드 검증
    if (!id || !state) {
      return NextResponse.json(
        { error: "ID와 상태값은 필수입니다." },
        { status: 400 }
      );
    }

    // 상태값 유효성 검증
    if (!["PENDING", "CONFIRMED", "REJECTED"].includes(state)) {
      return NextResponse.json(
        { error: "올바르지 않은 상태값입니다." },
        { status: 400 }
      );
    }

    // 상태 업데이트
    const result = await updateTrainerOffState(sessionOrResponse.roleId, {
      id,
      state,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Update trainer off state API error:", error);

    // 권한 에러는 403으로 반환
    if (error instanceof Error && error.message.includes("권한이 없거나")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}