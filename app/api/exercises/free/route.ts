import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getFreeExercises } from "@/app/services/exercise/exercise.service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exercises = await getFreeExercises();
    return NextResponse.json({ ok: true, data: exercises });
  } catch (error) {
    console.error("프리웨이트 운동 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}