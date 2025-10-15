// app/api/manager/centers/[id]/machines/route.ts

import { getSessionOrReturn401 } from "@/app/lib/session";
import {
  createMachine,
  CreateMachineInput,
  CreateMachineResult,
} from "@/app/services/fitness-center/machine.service";
import { NextRequest, NextResponse } from "next/server";

// POST /api/fitness-center/[id]/machines - 머신 생성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  const session = sessionOrResponse;

  // 매니저 권한 확인
  if (session.role !== "MANAGER") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { id: centerId } = await params;

  if (!centerId) {
    return NextResponse.json(
      {
        error: "센터 ID가 필요합니다.",
      },
      { status: 400 }
    );
  }
  try {
    const body: CreateMachineInput = await request.json();

    // 입력 검증
    if (!body.title || !body.settings || body.settings.length === 0) {
      return NextResponse.json(
        { error: "머신 제목과 최소 하나의 설정이 필요합니다." },
        { status: 400 }
      );
    }

    // 설정 검증
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

    // Machine 생성
    const createdMachine: CreateMachineResult = await createMachine(
      centerId,
      body
    );

    return NextResponse.json(createdMachine, { status: 201 });
  } catch (error) {
    console.error("머신 생성 실패:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
