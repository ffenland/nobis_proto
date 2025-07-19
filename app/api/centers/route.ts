import { NextResponse } from "next/server";
import {
  getAllCentersWithStats,
  ICentersWithStats,
} from "@/app/lib/services/fitness-center.service";
import { getSession } from "@/app/lib/session";

// GET: 모든 센터 목록 조회 (통계 포함)
export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.role !== "MANAGER") {
      return NextResponse.json(
        { error: "매니저 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const centers = await getAllCentersWithStats();

    return NextResponse.json({
      success: true,
      data: centers,
    });
  } catch (error) {
    console.error("센터 목록 조회 오류:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "센터 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}
