import { NextRequest, NextResponse } from "next/server";
import {
  getCenterWorkingHours,
  updateCenterWorkingHours,
  syncTrainerWorkingHours,
} from "@/app/lib/services/fitness-center.service";
import { getSession } from "@/app/lib/session";
import { z } from "zod";

const WorkingHourSchema = z.object({
  dayOfWeek: z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]),
  openTime: z.number().min(0).max(2359),
  closeTime: z.number().min(0).max(2359),
});

const UpdateWorkingHoursSchema = z.object({
  workingHours: z.array(WorkingHourSchema),
});
type Params = Promise<{ id: string }>;
// GET: 센터의 기본 근무시간 조회
export async function GET(
  _request: NextRequest,
  segmentData: { params: Params }
) {
  const params = await segmentData.params;
  const id = params.id;
  try {
    const session = await getSession();

    if (!session || session.role !== "MANAGER") {
      return NextResponse.json(
        { error: "매니저 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const result = await getCenterWorkingHours(id);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("센터 근무시간 조회 오류:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "센터 근무시간을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}

// PUT: 센터의 기본 근무시간 업데이트
export async function PUT(
  request: NextRequest,
  segmentData: { params: Params }
) {
  const params = await segmentData.params;
  const id = params.id;
  try {
    const session = await getSession();

    if (!session || session.role !== "MANAGER") {
      return NextResponse.json(
        { error: "매니저 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { workingHours } = UpdateWorkingHoursSchema.parse(body);

    // 1. 센터 기본 근무시간 업데이트
    const result = await updateCenterWorkingHours(id, workingHours);

    // 2. 트레이너들 근무시간 동기화
    let syncResult;
    try {
      syncResult = await syncTrainerWorkingHours(id);
    } catch (syncError) {
      console.error("트레이너 근무시간 동기화 오류:", syncError);
      // 센터 업데이트는 성공했지만 트레이너 동기화 실패한 경우
      return NextResponse.json({
        success: true,
        data: result,
        syncResult: { success: false, error: "트레이너 근무시간 동기화에 실패했습니다." },
        message: "센터 기본 근무시간이 업데이트되었지만, 트레이너 동기화에 문제가 있습니다.",
      });
    }

    return NextResponse.json({
      success: true,
      data: result,
      syncResult,
      message: "센터 기본 근무시간과 트레이너 근무시간이 업데이트되었습니다.",
    });
  } catch (error) {
    console.error("센터 근무시간 업데이트 오류:", error);

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
      { error: "센터 근무시간을 업데이트할 수 없습니다." },
      { status: 500 }
    );
  }
}
