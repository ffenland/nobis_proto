// app/api/manager/trainers/[trainerId]/pt/[ptId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import {
  TrainerManagementService,
  type IPtRecordFilters,
} from "@/app/lib/services/trainer-management.service";

export async function GET(
  request: NextRequest,
  { params }: { params: { trainerId: string; ptId: string } }
) {
  try {
    // 세션 및 권한 확인
    const session = await getSession();
    if (!session || !session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "MANAGER") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { trainerId, ptId } = params;
    if (!trainerId || !ptId) {
      return NextResponse.json(
        {
          error: "Trainer ID and PT ID are required",
        },
        { status: 400 }
      );
    }

    // 쿼리 파라미터 추출
    const { searchParams } = new URL(request.url);
    const completed = searchParams.get("completed");

    const filters: IPtRecordFilters = {
      ptId,
      completed:
        completed === "true" ? true : completed === "false" ? false : undefined,
    };

    // 서비스 호출
    const trainerManagementService = TrainerManagementService.getInstance();
    const ptRecords = await trainerManagementService.getPtRecordDetails(
      filters
    );

    return NextResponse.json({
      ptRecords,
      trainerId,
      ptId,
      filters,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Manager PT Record Details API] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
