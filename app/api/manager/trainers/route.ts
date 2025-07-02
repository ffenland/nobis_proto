// app/api/manager/trainers/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import {
  TrainerManagementService,
  type ITrainerListFilters,
} from "@/app/lib/services/trainer-management.service";

export async function GET(request: NextRequest) {
  try {
    // 세션 및 권한 확인
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "MANAGER") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // 쿼리 파라미터 추출
    const { searchParams } = new URL(request.url);
    const filters: ITrainerListFilters = {
      centerId: searchParams.get("centerId") || undefined,
      search: searchParams.get("search") || undefined,
    };

    // 서비스 호출
    const trainerManagementService = TrainerManagementService.getInstance();
    const trainersWithStats =
      await trainerManagementService.getTrainersWithStats(filters);

    return NextResponse.json({
      trainers: trainersWithStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Manager Trainers API] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
