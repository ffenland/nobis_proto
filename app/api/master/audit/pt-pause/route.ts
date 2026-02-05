import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import {
  getPtPauses,
  approvePtPause,
} from "@/app/services/master/audit.service";
import { logApiError } from "@/app/services/error/error-logging.service";

export async function GET(request: NextRequest) {
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
    const ptPauses = await getPtPauses(sessionOrResponse.roleId);
    return NextResponse.json(ptPauses);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "PT_PAUSE_GET_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getPtPauses",
      },
      tags: ["api", "master", "pt-pause"],
    });

    return NextResponse.json(
      { error: "PT 일시정지 목록을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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
    const body = await request.json();
    const { ptPauseId } = body;

    if (!ptPauseId) {
      return NextResponse.json(
        { error: "ptPauseId가 필요합니다." },
        { status: 400 }
      );
    }

    const result = await approvePtPause(sessionOrResponse.roleId, ptPauseId);

    return NextResponse.json(result);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "PT_PAUSE_APPROVE_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "approvePtPause",
      },
      tags: ["api", "master", "pt-pause", "approve"],
    });

    const errorMessage =
      error instanceof Error
        ? error.message
        : "PT 일시정지 승인 중 오류가 발생했습니다.";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
