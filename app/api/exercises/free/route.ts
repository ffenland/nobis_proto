import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getFreeExercises } from "@/app/services/exercise/exercise.service";
import { logApiError } from "@/app/services/error/error-logging.service";
import { createFreeExercise } from "@/app/services/manager/manager-exercise.service";

export async function GET(request: NextRequest) {
  // 1. 세션 확인
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 3. 비즈니스 로직
  try {
    const exercises = await getFreeExercises();
    return NextResponse.json(exercises);
  } catch (error) {
    // 4. 에러 로깅
    await logApiError(request, error as Error, {
      errorCode: "EXERCISE_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getFreeExercises",
      },
      tags: ["exercise", "free"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // 1. 세션 확인
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }
  // 2. 매니저 권한 확인
  if (sessionOrResponse.role !== "MANAGER") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  // 3. 비즈니스 로직
  try {
    const { title, description } = await request.json();
    const exercise = await createFreeExercise({ title, description });
    return NextResponse.json(exercise);
  } catch (error) {
    // 4. 에러 로깅
    await logApiError(request, error as Error, {
      errorCode: "EXERCISE_002",
      userId: sessionOrResponse.id,
      metadata: {
        action: "createFreeExercise",
      },
      tags: ["exercise", "free", "create"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
