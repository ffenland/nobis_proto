// app/api/trainer/equipment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getEquipmentListService } from "@/app/lib/services/trainer/pt-record.service";
import { EquipmentCategory } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const centerId = searchParams.get("centerId");
    const category = searchParams.get("category") as EquipmentCategory | null;

    if (!centerId) {
      return NextResponse.json(
        { error: "centerId가 필요합니다." },
        { status: 400 }
      );
    }

    let equipment;

    if (category) {
      if (!Object.values(EquipmentCategory).includes(category)) {
        return NextResponse.json(
          { error: "유효하지 않은 카테고리입니다." },
          { status: 400 }
        );
      }
      equipment = await getEquipmentListService(centerId, category);
    } else {
      equipment = await getEquipmentListService(centerId);
    }

    return NextResponse.json(equipment);
  } catch (error) {
    console.error("운동기구 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
