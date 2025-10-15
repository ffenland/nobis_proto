import { NextRequest, NextResponse } from "next/server";
import {
  getStretchingExerciseDetail,
  updateStretchingExerciseDescription,
} from "@/app/services/exercise/exercise.service";
import { getSessionOrReturn401 } from "@/app/lib/session";

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const params = await segmentData.params;
    const { id } = params;

    const exercise = await getStretchingExerciseDetail(id);

    if (!exercise) {
      return NextResponse.json(
        { error: "Exercise not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(exercise);
  } catch (error) {
    console.error("Failed to fetch stretching exercise detail:", error);
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
  // 세션 확인
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 매니저 권한 확인
  if (sessionOrResponse.role !== "MANAGER") {
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

    const exercise = await updateStretchingExerciseDescription(id, description);

    return NextResponse.json(exercise);
  } catch (error) {
    console.error("Failed to update stretching exercise:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
