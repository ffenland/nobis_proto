import { getSessionOrReturn401 } from "@/app/lib/session";
import { getExerciseListForMaster } from "@/app/services/master/master-exercise.service";
import { NextRequest, NextResponse } from "next/server";
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
    const { free: freeExercises, stretching: stretchingExercises } =
      await getExerciseListForMaster();
    return NextResponse.json({ freeExercises, stretchingExercises });
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_MASTER_EXERCISES_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getExerciseListForMaster",
        error: error,
      },
      tags: ["api", "master", "exercises"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
