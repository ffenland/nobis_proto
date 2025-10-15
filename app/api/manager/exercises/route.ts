import { FreeExercise } from "./../../../services/exercise/exercise.service";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getExerciseListForManager } from "@/app/services/manager/manager-exercise.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // 세션 확인
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // MANAGER 권한 확인
  if (sessionOrResponse.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { free: freeExercises, stretching: stretchingExercises } =
      await getExerciseListForManager();
    return NextResponse.json({ freeExercises, stretchingExercises });
  } catch (error) {}
}
