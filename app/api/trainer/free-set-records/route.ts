// app/api/trainer/free-set-records/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

// 프리웨이트 세트 기록 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ptRecordItemId, reps, set, equipmentIds } = body;

    if (!equipmentIds || !Array.isArray(equipmentIds)) {
      return NextResponse.json(
        { error: "equipmentIds가 필요합니다." },
        { status: 400 }
      );
    }

    const freeSetRecord = await prisma.freeSetRecord.create({
      data: {
        reps,
        set,
        ptRecordItemId,
        equipments: {
          connect: equipmentIds.map((equipmentId: string) => ({
            id: equipmentId,
          })),
        },
      },
      select: {
        id: true,
        reps: true,
        set: true,
        equipments: {
          select: {
            id: true,
            title: true,
            category: true,
            primaryValue: true,
            primaryUnit: true,
            secondaryValue: true,
            secondaryUnit: true,
          },
        },
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

// 프리웨이트 세트 기록 조회
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

    const freeSetRecords = await prisma.freeSetRecord.findMany({
      where: {
        ptRecordItemId,
      },
      select: {
        id: true,
        reps: true,
        set: true,
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
      orderBy: {
        set: "asc",
      },
    });

    return NextResponse.json(freeSetRecords);
  } catch (error) {
    console.error("Free Set Record 조회 실패:", error);
    return NextResponse.json(
      { error: "프리웨이트 세트 기록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
