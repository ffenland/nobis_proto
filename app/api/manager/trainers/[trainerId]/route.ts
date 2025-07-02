// app/api/manager/trainers/[trainerId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { TrainerManagementService } from "@/app/lib/services/trainer-management.service";

type Params = Promise<{ trainerId: string }>;

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  const params = await segmentData.params;
  const trainerId = params.trainerId;
  try {
    // 세션 및 권한 확인
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "MANAGER") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!trainerId) {
      return NextResponse.json(
        { error: "Trainer ID is required" },
        { status: 400 }
      );
    }

    // 쿼리 파라미터 추출
    const { searchParams } = new URL(request.url);
    const centerId = searchParams.get("centerId") || undefined;

    // 서비스 호출
    const trainerManagementService = TrainerManagementService.getInstance();
    const trainerDetail = await trainerManagementService.getTrainerDetail({
      trainerId,
      centerId,
    });

    return NextResponse.json({
      trainer: trainerDetail,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Manager Trainer Detail API] Error:", error);

    if (
      error instanceof Error &&
      error.message === "트레이너를 찾을 수 없습니다."
    ) {
      return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
