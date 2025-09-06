import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { updateTrainerWorkingHours } from "@/app/lib/services/manager/manager-trainer.service";
import { z } from "zod";

type Params = Promise<{ trainerId: string }>;

// PUT: 트레이너 근무시간 일괄 업데이트 (매니저용)
export async function PUT(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const params = await segmentData.params;
    const trainerId = params.trainerId;

    const session = await getSession();
    if (!session || session.role !== "MANAGER") {
      return NextResponse.json(
        { error: "매니저 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = await updateTrainerWorkingHours(trainerId, body);

    return NextResponse.json(result);
  } catch (error) {
    console.error("트레이너 근무시간 업데이트 오류:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "잘못된 요청 데이터입니다.", details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "근무시간을 업데이트할 수 없습니다." },
      { status: 500 }
    );
  }
}