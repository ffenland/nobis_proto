import { NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getFreeExercises } from "@/app/services/exercise/exercise.service";

export async function GET() {
  try {
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    const exercises = await getFreeExercises();
    return NextResponse.json(exercises);
  } catch (error) {
    console.error("프리웨이트 운동 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
