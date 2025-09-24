// app/api/manager/dashboard/schedule/route.ts
import { NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getPendingTrainerOffCount } from "@/app/services/manager/dashboard.service";

export async function GET() {
  try {
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    // 매니저 권한 확인
    if (sessionOrResponse.role !== "MANAGER") {
      return NextResponse.json(
        { error: "매니저 권한이 필요합니다." },
        { status: 403 }
      );
    }

    // PENDING 상태 TrainerOff 개수 조회
    const pendingCount = await getPendingTrainerOffCount(sessionOrResponse.roleId);

    return NextResponse.json({
      pendingTrainerOffCount: pendingCount,
    });
  } catch (error) {
    console.error("Manager dashboard schedule API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}