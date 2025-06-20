// app/api/trainer/free-set-records/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

// 프리웨이트 세트 기록 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ptRecordItemId, reps, set, weightIds } = body;

    const freeSetRecord = await prisma.freeSetRecord.create({
      data: {
        reps,
        set,
        ptRecordItemId,
        weights: {
          connect: weightIds.map((weightId: string) => ({ id: weightId })),
        },
      },
      include: {
        weights: true,
      },
    });

    return NextResponse.json(freeSetRecord);
  } catch (error) {
    console.error("Free Set Record 생성 실패:", error);
    return NextResponse.json(
      { error: "프리웨이트 세트 기록 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
