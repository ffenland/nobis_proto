import { NextRequest, NextResponse } from "next/server";
import {
  getFreeExerciseDetail,
  updateFreeExerciseDescription,
} from "@/app/services/exercise/exercise.service";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { logApiError } from "@/app/services/error/error-logging.service";

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  try {
    const params = await segmentData.params;
    const { id } = params;

    const exercise = await getFreeExerciseDetail(id);

    if (!exercise) {
      return NextResponse.json(
        { error: "Exercise not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(exercise);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_FREE_EXERCISE_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getFreeExerciseDetail",
      },
      tags: ["api", "exercise", "free"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  segmentData: { params: Params }
) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const params = await segmentData.params;
    const { id } = params;
    const body = await request.json();
    const { description } = body;

    if (typeof description !== "string") {
      return NextResponse.json(
        { error: "Invalid description" },
        { status: 400 }
      );
    }

    const exercise = await updateFreeExerciseDescription(id, description);

    return NextResponse.json(exercise);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_FREE_EXERCISE_002",
      userId: sessionOrResponse.id,
      metadata: {
        action: "updateFreeExerciseDescription",
      },
      tags: ["api", "exercise", "free", "update"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
