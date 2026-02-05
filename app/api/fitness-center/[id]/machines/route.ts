// app/api/fitness-center/[id]/machines/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getMachinesByFitnessCenter } from "@/app/services/fitness-center/machine.service";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { logApiError } from "@/app/services/error/error-logging.service";

// GET /api/fitness-center/[id]/machines - 센터의 머신 목록 조회 (레슨 기록용)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

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

    const data = await getMachinesByFitnessCenter(centerId);

    return NextResponse.json(data);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_CENTER_MACHINE_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getMachinesByFitnessCenter",
      },
      tags: ["api", "machine", "fitness-center"],
    });

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
