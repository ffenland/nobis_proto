// app/api/manager/trainers/[trainerId]/pt/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import {
  TrainerManagementService,
  type IPtListFilters,
} from "@/app/lib/services/trainer-management.service";

type Params = Promise<{ trainerId: string }>;
export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  const params = await segmentData.params;
  const { trainerId } = params;
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
    const filters: IPtListFilters = {
      trainerId,
      state: (searchParams.get("state") as IPtListFilters["state"]) || "ALL",
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
    };

    // 서비스 호출
    const trainerManagementService = TrainerManagementService.getInstance();
    const ptList = await trainerManagementService.getTrainerPtList(filters);

    return NextResponse.json({
      ptList,
      filters,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Manager Trainer PT List API] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
