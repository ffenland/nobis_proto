// app/api/manager/fitness-centers/route.ts

import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { TrainerManagementService } from "@/app/lib/services/trainer-management.service";

export async function GET() {
  try {
    // 세션 및 권한 확인
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "MANAGER") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // 서비스 호출
    const trainerManagementService = TrainerManagementService.getInstance();
    const fitnessCenters = await trainerManagementService.getFitnessCenters();

    return NextResponse.json({
      centers: fitnessCenters,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Manager Fitness Centers API] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
