import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getTrainerCenterDefaultHours } from "@/app/lib/services/manager/manager-trainer.service";

type Params = Promise<{ trainerId: string }>;

// GET: 트레이너의 센터 기본 근무시간 조회 (매니저용)
export async function GET(
  _request: NextRequest,
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

    const result = await getTrainerCenterDefaultHours(trainerId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("센터 기본 근무시간 조회 오류:", error);
    return NextResponse.json(
      { error: "센터 기본 근무시간을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}