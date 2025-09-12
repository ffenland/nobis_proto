// app/api/fitness-center/[id]/machines/route.ts
import { NextRequest, NextResponse } from "next/server";
import { 
  getMachinesByFitnessCenter,
  createMachine,
  type CreateMachineInput,
} from "@/app/services/fitness-center/machine.service";
import { getSessionOrReturn401 } from "@/app/lib/session";

// GET /api/fitness-center/[id]/machines - 센터의 머신 목록 조회 (레슨 기록용)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: centerId } = await params;
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }
    if (!centerId) {
      return NextResponse.json(
        {
          ok: false,
          error: "센터 ID가 필요합니다.",
        },
        { status: 400 }
      );
    }

    // 센터 머신 정보 조회 (서비스 함수 호출)
    const data = await getMachinesByFitnessCenter(centerId);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch center machines:", error);

    // 센터를 찾을 수 없는 경우
    if (
      error instanceof Error &&
      error.message === "센터를 찾을 수 없습니다."
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

// POST /api/fitness-center/[id]/machines - 머신 생성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: centerId } = await params;
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    // 권한 검증 - MANAGER만 Machine 생성 가능
    if (sessionOrResponse.role !== "MANAGER") {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    if (!centerId) {
      return NextResponse.json(
        {
          ok: false,
          error: "센터 ID가 필요합니다.",
        },
        { status: 400 }
      );
    }

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
      if (!setting.title || !setting.unit || !setting.values || setting.values.length === 0) {
        return NextResponse.json(
          { error: "각 설정은 제목, 단위, 값이 모두 필요합니다." },
          { status: 400 }
        );
      }
    }

    // Machine 생성
    const createdMachine = await createMachine(centerId, body);
    
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
