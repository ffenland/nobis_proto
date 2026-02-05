import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { getAllTrainerLevelsSimple } from "@/app/services/master/master-trainer.service";
import { logApiError } from "@/app/services/error/error-logging.service";

export async function GET(request: NextRequest) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const levels = await getAllTrainerLevelsSimple();
    return NextResponse.json(levels);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_TRAINER_LEVEL_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getAllTrainerLevels",
      },
      tags: ["api", "trainer-level", "master"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
