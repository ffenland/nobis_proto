// app/api/trainer/stretching-exercise-records/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

// 스트레칭 기록 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ptRecordItemId, stretchingExerciseId, description } = body;

    const stretchingExerciseRecord =
      await prisma.stretchingExerciseRecord.create({
        data: {
          ptRecordItemId,
          stretchingExerciseId,
          description,
        },
        include: {
          stretchingExercise: true,
        },
      });

    return NextResponse.json(stretchingExerciseRecord);
  } catch (error) {
    console.error("스트레칭 기록 생성 실패:", error);
    return NextResponse.json(
      { error: "스트레칭 기록 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
