import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getAllTrainers } from "@/app/services/master/master-trainer.service";
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
    const trainers = await getAllTrainers();
    return NextResponse.json(trainers);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_MASTER_TRAINERS_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getAllTrainers",
      },
      tags: ["api", "master", "trainers"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
