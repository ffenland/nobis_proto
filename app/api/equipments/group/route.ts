import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { 
  getEquipmentGroups,
  createEquipmentGroup,
  type CreateEquipmentGroupInput 
} from "@/app/services/fitness-center/equipment.service";

export async function GET() {
  try {
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    const groups = await getEquipmentGroups();
    return NextResponse.json(groups);
  } catch (error) {
    console.error("Equipment 그룹 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    // MANAGER만 그룹 생성 가능
    if (sessionOrResponse.role !== "MANAGER") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body: CreateEquipmentGroupInput = await request.json();

    // 입력 검증
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: "그룹명은 필수입니다" },
        { status: 400 }
      );
    }

    const group = await createEquipmentGroup({
      name: body.name.trim(),
      description: body.description?.trim() || undefined,
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error: any) {
    console.error("Equipment 그룹 생성 실패:", error);
    
    // 중복 이름 에러 처리
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "이미 존재하는 그룹명입니다" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}