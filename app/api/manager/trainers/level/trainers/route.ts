import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { getAllTrainersForLevel } from "@/app/services/manager/manager-trainer.service";
import { logApiError } from "@/app/services/error/error-logging.service";

export async function GET(request: NextRequest) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const trainers = await getAllTrainersForLevel();
    return NextResponse.json(trainers);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_TRAINER_LEVEL_004",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getAllTrainersForLevel",
      },
      tags: ["api", "trainer-level", "manager", "trainers"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
