import { NextRequest, NextResponse } from "next/server";
import {
  getMachineById,
  deactivateMachine,
} from "@/app/services/fitness-center/machine.service";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { logApiError } from "@/app/services/error/error-logging.service";

type Params = Promise<{ id: string }>;

// GET /api/machines/[id] - 머신 상세 정보 조회
export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  const params = await segmentData.params;
  const { id: machineId } = params;

  // 1. 세션 확인 (필수)
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 2. 입력 검증
  if (!machineId) {
    return NextResponse.json(
      {
        error: "머신 ID가 필요합니다.",
      },
      { status: 400 }
    );
  }

  // 3. 비즈니스 로직 (try-catch 내부)
  try {
    const machine = await getMachineById(machineId);
    return NextResponse.json(machine);
  } catch (error) {
    // 머신을 찾을 수 없는 경우
    if (
      error instanceof Error &&
      error.message === "머신을 찾을 수 없습니다."
    ) {
      await logApiError(request, error, {
        errorCode: "API_MACHINE_001_NOT_FOUND",
        userId: sessionOrResponse.id,
        metadata: {
          action: "getMachineById",
          machineId,
          errorType: "not_found",
        },
        tags: ["api", "machine", "get", "not-found"],
      });

      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 404 }
      );
    }

    // 기타 서버 오류
    await logApiError(request, error as Error, {
      errorCode: "API_MACHINE_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getMachineById",
        machineId,
        errorType: "internal_error",
      },
      tags: ["api", "machine", "get", "error"],
    });

    return NextResponse.json(
      {
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/machines/[id] - 머신 삭제 (비활성화)
export async function DELETE(
  request: NextRequest,
  segmentData: { params: Params }
) {
  const params = await segmentData.params;
  const { id: machineId } = params;

  // 1. 세션 확인 (필수)
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 2. 역할별 권한 확인 (MASTER만 삭제 가능)
  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 입력 검증
  if (!machineId) {
    return NextResponse.json(
      {
        error: "머신 ID가 필요합니다.",
      },
      { status: 400 }
    );
  }

  // 3. 비즈니스 로직 (try-catch 내부)
  try {
    const result = await deactivateMachine(machineId);

    return NextResponse.json({
      ok: true,
      message: "머신이 성공적으로 비활성화되었습니다.",
      result: {
        deactivatedMachine: result.deactivatedMachine,
        deletedImages: result.deletedImages,
        failedImages: result.failedImages,
      },
    });
  } catch (error) {
    // 머신을 찾을 수 없는 경우
    if (
      error instanceof Error &&
      error.message === "머신을 찾을 수 없습니다."
    ) {
      await logApiError(request, error, {
        errorCode: "API_MACHINE_002_NOT_FOUND",
        userId: sessionOrResponse.id,
        metadata: {
          action: "deactivateMachine",
          machineId,
          errorType: "not_found",
        },
        tags: ["api", "machine", "delete", "manager", "not-found"],
      });

      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 404 }
      );
    }

    // Cloudflare 설정 오류
    if (
      error instanceof Error &&
      error.message === "Cloudflare 설정이 누락되었습니다."
    ) {
      await logApiError(request, error, {
        errorCode: "API_MACHINE_002_CLOUDFLARE_CONFIG",
        userId: sessionOrResponse.id,
        metadata: {
          action: "deactivateMachine",
          machineId,
          errorType: "cloudflare_config_missing",
        },
        tags: ["api", "machine", "delete", "manager", "cloudflare", "config"],
      });

      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 }
      );
    }

    // 기타 서버 오류
    await logApiError(request, error as Error, {
      errorCode: "API_MACHINE_002",
      userId: sessionOrResponse.id,
      metadata: {
        action: "deactivateMachine",
        machineId,
        errorType: "internal_error",
      },
      tags: ["api", "machine", "delete", "manager", "error"],
    });

    return NextResponse.json(
      {
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
