// app/api/fitness-center/[id]/machines/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getMachinesByFitnessCenter } from "@/app/services/fitness-center/machine.service";
import { getSessionOrReturn401 } from "@/app/lib/session";

// GET /api/fitness-center/[id]/machines - 센터의 머신 목록 조회 (레슨 기록용)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: centerId } = await params;
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }
    if (!centerId) {
      return NextResponse.json(
        {
          ok: false,
          error: "센터 ID가 필요합니다.",
        },
        { status: 400 }
      );
    }

    // 센터 머신 정보 조회 (서비스 함수 호출)
    const data = await getMachinesByFitnessCenter(centerId);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch center machines:", error);

    // 센터를 찾을 수 없는 경우
    if (
      error instanceof Error &&
      error.message === "센터를 찾을 수 없습니다."
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
