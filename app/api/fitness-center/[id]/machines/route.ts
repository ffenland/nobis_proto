// app/api/fitness-center/[id]/machines/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getMachineForRecordByFitnessCenter } from "@/app/services/fitness-center/machine.service";

// GET /api/fitness-center/[id]/machines - 센터의 머신 목록 조회 (레슨 기록용)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: centerId } = await params;

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
    const data = await getMachineForRecordByFitnessCenter(centerId);

    return NextResponse.json(
      {
        ok: true,
        data,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
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
