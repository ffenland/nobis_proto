// app/api/trainer/pt-record-items/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

// PT Record Items 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ptRecordId, type, title, description, entry } = body;

    const ptRecordItem = await prisma.ptRecordItem.create({
      data: {
        ptRecordId,
        type,
        title,
        description,
        entry: entry || 0,
      },
    });

    return NextResponse.json(ptRecordItem);
  } catch (error) {
    console.error("PT Record Item 생성 실패:", error);
    return NextResponse.json(
      { error: "PT Record Item 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// app/api/trainer/pt-record-items/[ptRecordId]/route.ts
// PT Record Items 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { ptRecordId: string } }
) {
  try {
    const ptRecordItems = await prisma.ptRecord.findUnique({
      where: { id: params.ptRecordId },
      select: {
        items: {
          select: {
            id: true,
            title: true,
            description: true,
            entry: true,
            type: true,
            freeSetRecords: {
              select: {
                weights: true,
                id: true,
                reps: true,
                set: true,
              },
            },
            machineSetRecords: {
              select: {
                id: true,
                settingValues: {
                  select: {
                    id: true,
                    value: true,
                    machineSetting: {
                      select: {
                        id: true,
                        title: true,
                        unit: true,
                        machine: {
                          select: {
                            id: true,
                            title: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            stretchingExerciseRecords: {
              select: {
                id: true,
                stretchingExercise: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(ptRecordItems);
  } catch (error) {
    console.error("PT Record Items 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
