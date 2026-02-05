import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import {
  getTrainerById,
  updateTrainer,
  demoteManager,
  promoteToManager,
  assignLevelToTrainer,
  updateWorkingAt,
  updateTrainerCenter,
} from "@/app/services/master/master-trainer.service";
import { logApiError } from "@/app/services/error/error-logging.service";

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const params = await segmentData.params;
    const { id } = params;

    const trainer = await getTrainerById(id);

    if (!trainer) {
      return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
    }

    return NextResponse.json(trainer);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_MASTER_TRAINER_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getTrainerById",
      },
      tags: ["api", "master", "trainer"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// 통합 PATCH 메서드 - body에 있는 필드들을 확인하고 해당하는 서비스 함수들을 호출
export async function PATCH(
  request: NextRequest,
  segmentData: { params: Params }
) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // MASTER 권한만 허용
  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const params = await segmentData.params;
    const { id: trainerId } = params;
    const body = await request.json();

    const results: any = {
      success: true,
      updated: [],
    };

    // 1. 매니저 해임 (demoteManager)
    if (body.demoteManager === true) {
      await demoteManager(trainerId);
      results.updated.push("demoteManager");
    }

    // 2. 매니저 임명 (promoteManager)
    if (body.promoteManager && Array.isArray(body.centerIds)) {
      await promoteToManager(trainerId, body.centerIds);
      results.updated.push("promoteManager");
    }

    // 3. 트레이너 레벨 변경 (assignLevelToTrainer)
    if (body.hasOwnProperty("levelId")) {
      await assignLevelToTrainer(trainerId, body.levelId);
      results.updated.push("levelId");
    }

    // 4. 입사일 수정 (updateWorkingAt)
    if (body.workingAt) {
      await updateWorkingAt(trainerId, new Date(body.workingAt));
      results.updated.push("workingAt");
    }

    // 5. 소속 센터 변경 (updateTrainerCenter)
    if (body.hasOwnProperty("centerId")) {
      await updateTrainerCenter(trainerId, body.centerId);
      results.updated.push("centerId");
    }

    // 업데이트된 항목이 없으면 에러
    if (results.updated.length === 0) {
      return NextResponse.json(
        { error: "업데이트할 필드가 없습니다." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ...results,
      message: "트레이너 정보가 성공적으로 업데이트되었습니다.",
    });
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_MASTER_TRAINER_PATCH",
      userId: sessionOrResponse.id,
      metadata: {
        action: "patchTrainer",
      },
      tags: ["api", "master", "trainer", "patch"],
    });

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
