import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import {
  getCenterEquipments,
  createEquipment,
  type CreateEquipmentInput,
} from "@/app/services/fitness-center/equipment.service";

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    const params = await segmentData.params;
    const { id: centerId } = params;

    const equipments = await getCenterEquipments(centerId);
    return NextResponse.json(equipments);
  } catch (error) {
    console.error("센터 장비 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    const params = await segmentData.params;
    const { id: centerId } = params;

    // 권한 확인 - MANAGER만 Equipment 생성 가능
    if (sessionOrResponse.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: CreateEquipmentInput = await request.json();

    // 입력 검증 - title만 필수
    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Equipment 생성
    const createdEquipment = await createEquipment(centerId, body);

    return NextResponse.json(createdEquipment, { status: 201 });
  } catch (error) {
    console.error("Equipment 생성 실패:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
