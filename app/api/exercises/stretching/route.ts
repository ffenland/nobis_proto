import { NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getStretchingExercises } from "@/app/services/exercise/exercise.service";

export async function GET() {
  try {
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }
    const exercises = await getStretchingExercises();
    return NextResponse.json(exercises);
  } catch (error) {
    console.error("스트레칭 운동 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
