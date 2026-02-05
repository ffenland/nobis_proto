import { NextRequest, NextResponse } from "next/server";
import {
  getCenterWorkingHours,
  updateCenterWorkingHours,
  syncTrainerWorkingHours,
} from "@/app/lib/services/fitness-center.service";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { logApiError } from "@/app/services/error/error-logging.service";
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
  request: NextRequest,
  segmentData: { params: Params }
) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (
    sessionOrResponse.role !== "MANAGER" &&
    sessionOrResponse.role !== "MASTER"
  ) {
    return NextResponse.json(
      { error: "매니저 또는 마스터 권한이 필요합니다." },
      { status: 403 }
    );
  }

  try {
    const params = await segmentData.params;
    const id = params.id;

    const result = await getCenterWorkingHours(id);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_CENTER_WORKING_HOURS_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getCenterWorkingHours",
      },
      tags: ["api", "working-hours", "fitness-center"],
    });

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
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json(
      { error: "마스터 권한이 필요합니다." },
      { status: 403 }
    );
  }

  try {
    const params = await segmentData.params;
    const id = params.id;

    const body = await request.json();
    const { workingHours } = UpdateWorkingHoursSchema.parse(body);

    // 1. 센터 기본 근무시간 업데이트
    const result = await updateCenterWorkingHours(id, workingHours);

    // 2. 트레이너들 근무시간 동기화
    let syncResult;
    try {
      syncResult = await syncTrainerWorkingHours(id);
    } catch (syncError) {
      await logApiError(request, syncError as Error, {
        errorCode: "API_CENTER_WORKING_HOURS_003",
        userId: sessionOrResponse.id,
        metadata: {
          action: "syncTrainerWorkingHours",
        },
        tags: ["api", "working-hours", "fitness-center", "sync"],
      });

      return NextResponse.json({
        success: true,
        data: result,
        syncResult: {
          success: false,
          error: "트레이너 근무시간 동기화에 실패했습니다.",
        },
        message:
          "센터 기본 근무시간이 업데이트되었지만, 트레이너 동기화에 문제가 있습니다.",
      });
    }

    return NextResponse.json({
      success: true,
      data: result,
      syncResult,
      message: "센터 기본 근무시간과 트레이너 근무시간이 업데이트되었습니다.",
    });
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_CENTER_WORKING_HOURS_002",
      userId: sessionOrResponse.id,
      metadata: {
        action: "updateCenterWorkingHours",
      },
      tags: ["api", "working-hours", "fitness-center", "update"],
    });

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
