// app/api/master/centers/[id]/machines/route.ts

import { getSessionOrReturn401 } from "@/app/lib/session";
import {
  createMachine,
  CreateMachineInput,
  CreateMachineResult,
} from "@/app/services/fitness-center/machine.service";
import { NextRequest, NextResponse } from "next/server";
import { logApiError } from "@/app/services/error/error-logging.service";

// POST /api/fitness-center/[id]/machines - 머신 생성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const { id: centerId } = await params;

    if (!centerId) {
      return NextResponse.json(
        {
          error: "센터 ID가 필요합니다.",
        },
        { status: 400 }
      );
    }

    const body: CreateMachineInput = await request.json();

    if (!body.title || !body.settings || body.settings.length === 0) {
      return NextResponse.json(
        { error: "머신 제목과 최소 하나의 설정이 필요합니다." },
        { status: 400 }
      );
    }

    for (const setting of body.settings) {
      if (
        !setting.title ||
        !setting.unit ||
        !setting.values ||
        setting.values.length === 0
      ) {
        return NextResponse.json(
          { error: "각 설정은 제목, 단위, 값이 모두 필요합니다." },
          { status: 400 }
        );
      }
    }

    const createdMachine: CreateMachineResult = await createMachine(
      centerId,
      body
    );

    return NextResponse.json(createdMachine, { status: 201 });
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_MASTER_MACHINE_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "createMachine",
      },
      tags: ["api", "machine", "master", "create"],
    });

    return NextResponse.json(
      {
        ok: false,
        error: "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
