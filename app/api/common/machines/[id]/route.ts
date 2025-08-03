// app/api/machines/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";


// 값 비교 함수
const compareValues = (a: string, b: string) => {
  const numA = parseFloat(a);
  const numB = parseFloat(b);

  // 둘 다 숫자인 경우
  if (!isNaN(numA) && !isNaN(numB)) {
    return numA - numB;
  }

  // 하나만 숫자인 경우 숫자를 앞으로
  if (!isNaN(numA)) return -1;
  if (!isNaN(numB)) return 1;

  // 둘 다 문자열인 경우
  return a.localeCompare(b);
};

// GET /api/machines/[id] - 머신 상세 정보 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: machineId } = params;

    if (!machineId) {
      return NextResponse.json(
        { error: "머신 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
      select: {
        id: true,
        title: true,
        fitnessCenter: {
          select: {
            id: true,
            title: true,
          },
        },
        machineSetting: {
          select: {
            id: true,
            title: true,
            unit: true,
            values: {
              select: {
                id: true,
                value: true,
              },
            },
          },
        },
      },
    });

    if (!machine) {
      return NextResponse.json(
        { error: "머신을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 데이터 변환 (클라이언트에서 사용하는 형태로)
    const transformedMachine = {
      ...machine,
      machineSetting: machine.machineSetting.map((setting) => ({
        ...setting,
        isNew: false,
        values: setting.values
          .sort((a, b) => compareValues(a.value, b.value))
          .map((value) => ({
            ...value,
            editState: "HOLD", // IMachineValueEditState.HOLD
          })),
      })),
    };

    return NextResponse.json(transformedMachine, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Failed to fetch machine detail:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
