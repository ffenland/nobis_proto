import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getCenterWorkingHours } from "@/app/lib/services/fitness-center.service";
import prisma from "@/app/lib/prisma";

type Params = Promise<{ trainerId: string }>;

// GET: 트레이너의 센터 기본 근무시간 조회 (매니저용)
export async function GET(
  _request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const params = await segmentData.params;
    const trainerId = params.trainerId;

    const session = await getSession();
    if (!session || session.role !== "MANAGER") {
      return NextResponse.json(
        { error: "매니저 권한이 필요합니다." },
        { status: 403 }
      );
    }

    // 트레이너 정보로 센터 ID 조회
    const trainer = await prisma.trainer.findUnique({
      where: { id: trainerId },
      select: {
        fitnessCenterId: true,
      },
    });

    if (!trainer?.fitnessCenterId) {
      return NextResponse.json(
        { error: "트레이너가 소속된 센터를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const centerWorkingHours = await getCenterWorkingHours(
      trainer.fitnessCenterId
    );

    return NextResponse.json({
      success: true,
      data: centerWorkingHours,
    });
  } catch (error) {
    console.error("센터 기본 근무시간 조회 오류:", error);
    return NextResponse.json(
      { error: "센터 기본 근무시간을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}