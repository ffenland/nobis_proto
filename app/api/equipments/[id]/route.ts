import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { 
  getEquipmentById,
  deleteEquipment
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
    console.error("Equipment 상세 조회 실패:", error);
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
  try {
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    // MANAGER만 Equipment 삭제 가능
    if (sessionOrResponse.role !== "MANAGER") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

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
    console.error("Equipment 삭제 실패:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}