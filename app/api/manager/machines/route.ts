// app/api/manager/machines/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

// 센터별 머신 목록 조회 함수
const getMachines = async (centerId: string) =>
  await prisma.machine.findMany({
    where: {
      fitnessCenterId: centerId,
    },
    select: {
      id: true,
      title: true,
    },
    orderBy: {
      title: "asc",
    },
  });

// GET /api/centers/[id] - 센터의 전체 머신/도구 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: centerId } = params;

    if (!centerId) {
      return NextResponse.json(
        {
          ok: false,
          error: "센터 ID가 필요합니다.",
        },
        { status: 400 }
      );
    }

    // 센터 존재 확인
    const fitnessCenter = await prisma.fitnessCenter.findUnique({
      where: {
        id: centerId,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!fitnessCenter) {
      return NextResponse.json(
        {
          ok: false,
          error: "센터를 찾을 수 없습니다.",
        },
        { status: 404 }
      );
    }

    // 머신 목록 조회
    const allMachines = await getMachines(centerId);

    return NextResponse.json(
      {
        ok: true,
        data: {
          machines: allMachines,
          center: fitnessCenter,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch center machines:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
