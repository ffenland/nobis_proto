import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getCenterEquipments } from "@/app/services/fitness-center/equipment.service";

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const session = await getSession();
    if (!session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await segmentData.params;
    const { id: centerId } = params;

    const equipments = await getCenterEquipments(centerId);
    return NextResponse.json({ ok: true, data: equipments });
  } catch (error) {
    console.error("센터 장비 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}