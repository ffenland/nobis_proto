// app/api/trainer/stretching-exercises/route.ts
import { NextResponse } from "next/server";
import { getStretchingExercisesService } from "@/app/lib/services/trainer/pt-record.service";

export async function GET() {
  try {
    const exercises = await getStretchingExercisesService();
    return NextResponse.json(exercises);
  } catch (error) {
    console.error("스트레칭 운동 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
