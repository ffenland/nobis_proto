import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import {
  getEquipmentById,
  deleteEquipment
} from "@/app/services/fitness-center/equipment.service";
import { logApiError } from "@/app/services/error/error-logging.service";

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  // 1. 세션 확인
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 3. 비즈니스 로직
  try {
    const params = await segmentData.params;
    const { id: equipmentId } = params;

    const equipment = await getEquipmentById(equipmentId);

    if (!equipment) {
      return NextResponse.json(
        { error: "Equipment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(equipment);
  } catch (error) {
    // 4. 에러 로깅
    await logApiError(request, error as Error, {
      errorCode: "EQUIPMENT_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getEquipmentById",
      },
      tags: ["equipment", "get"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  segmentData: { params: Params }
) {
  // 1. 세션 확인
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 2. 역할별 권한 확인
  if (sessionOrResponse.role !== "MANAGER") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  // 3. 비즈니스 로직
  try {
    const params = await segmentData.params;
    const { id: equipmentId } = params;

    // Equipment 존재 확인
    const equipment = await getEquipmentById(equipmentId);
    if (!equipment) {
      return NextResponse.json(
        { error: "Equipment not found" },
        { status: 404 }
      );
    }

    // Equipment 삭제 (이미지도 함께 삭제됨)
    const result = await deleteEquipment(equipmentId);

    return NextResponse.json({
      message: "Equipment deleted successfully",
      deletedEquipment: result,
    });
  } catch (error) {
    // 4. 에러 로깅
    await logApiError(request, error as Error, {
      errorCode: "EQUIPMENT_002",
      userId: sessionOrResponse.id,
      metadata: {
        action: "deleteEquipment",
      },
      tags: ["equipment", "delete"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}