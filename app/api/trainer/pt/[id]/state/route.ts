import { NextRequest, NextResponse } from "next/server";
import {
  getPtStateInfo,
  updatePtStateToRefunded,
  updatePtStateToFinished,
} from "@/app/services/trainer/pt.service";
import { logApiError } from "@/app/services/error/error-logging.service";
import { getSessionOrReturn401 } from "@/app/lib/session";

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  // 세션 처리를 먼저 수행
  const sessionOrResponse = await getSessionOrReturn401();

  // 401 응답인 경우 바로 반환
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 권한 확인 - TRAINER만 접근 가능
  if (sessionOrResponse.role !== "TRAINER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const params = await segmentData.params;
    const { id } = params;

    const ptStateInfo = await getPtStateInfo(id, sessionOrResponse.roleId);
    return NextResponse.json(ptStateInfo);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "PT_STATE_GET_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getPtState",
      },
      tags: ["api", "pt", "state", "trainer"],
    });

    return NextResponse.json(
      { error: "Failed to fetch PT state information" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  segmentData: { params: Params }
) {
  // 세션 처리를 먼저 수행
  const sessionOrResponse = await getSessionOrReturn401();

  // 401 응답인 경우 바로 반환
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 권한 확인 - TRAINER만 접근 가능
  if (sessionOrResponse.role !== "TRAINER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const params = await segmentData.params;
    const { id } = params;

    const body = await request.json();
    const { state } = body;

    // state로 어떤 작업인지 판별
    if (state === "REFUNDED") {
      // 환불 처리
      const updatedPt = await updatePtStateToRefunded(
        id,
        sessionOrResponse.roleId
      );
      return NextResponse.json(updatedPt);
    } else if (state === "FINISHED") {
      // 완료 처리
      const updatedPt = await updatePtStateToFinished(
        id,
        sessionOrResponse.roleId
      );
      return NextResponse.json(updatedPt);
    } else {
      return NextResponse.json(
        { error: "Invalid state value" },
        { status: 400 }
      );
    }
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "PT_STATE_UPDATE_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "updatePtState",
      },
      tags: ["api", "pt", "state", "trainer", "withdrawn"],
    });

    const errorMessage =
      error instanceof Error ? error.message : "Failed to update PT state";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
