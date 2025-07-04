// app/api/trainer/stretching-records/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

// 스트레칭 기록 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ptRecordItemId, stretchingExerciseId, description, equipmentIds } =
      body;

    if (!ptRecordItemId || !stretchingExerciseId) {
      return NextResponse.json(
        { error: "ptRecordItemId와 stretchingExerciseId가 필요합니다." },
        { status: 400 }
      );
    }

    const stretchingRecord = await prisma.stretchingExerciseRecord.create({
      data: {
        ptRecordItemId,
        stretchingExerciseId,
        description,
        equipments:
          equipmentIds && equipmentIds.length > 0
            ? {
                connect: equipmentIds.map((equipmentId: string) => ({
                  id: equipmentId,
                })),
              }
            : undefined,
      },
      select: {
        id: true,
        description: true,
        stretchingExercise: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        equipments: {
          select: {
            id: true,
            title: true,
            category: true,
            primaryValue: true,
            primaryUnit: true,
          },
        },
      },
    });

    return NextResponse.json(stretchingRecord);
  } catch (error) {
    console.error("스트레칭 기록 생성 실패:", error);
    return NextResponse.json(
      { error: "스트레칭 기록 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 스트레칭 기록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ptRecordItemId = searchParams.get("ptRecordItemId");

    if (!ptRecordItemId) {
      return NextResponse.json(
        { error: "ptRecordItemId가 필요합니다." },
        { status: 400 }
      );
    }

    const stretchingRecords = await prisma.stretchingExerciseRecord.findMany({
      where: {
        ptRecordItemId,
      },
      select: {
        id: true,
        description: true,
        stretchingExercise: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        equipments: {
          select: {
            id: true,
            title: true,
            category: true,
            primaryValue: true,
            primaryUnit: true,
          },
        },
      },
    });

    return NextResponse.json(stretchingRecords);
  } catch (error) {
    console.error("스트레칭 기록 조회 실패:", error);
    return NextResponse.json(
      { error: "스트레칭 기록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
