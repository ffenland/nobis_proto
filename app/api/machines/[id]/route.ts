import { NextRequest, NextResponse } from "next/server";
import { getMachineById } from "@/app/services/fitness-center/machine.service";
import { getSessionOrReturn401 } from "@/app/lib/session";
import prisma from "@/app/lib/prisma";

type Params = Promise<{ id: string }>;

// GET /api/machines/[id] - 머신 상세 정보 조회
export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const params = await segmentData.params;
    const { id: machineId } = params;
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    if (!machineId) {
      return NextResponse.json(
        {
          ok: false,
          error: "머신 ID가 필요합니다.",
        },
        { status: 400 }
      );
    }

    // 머신 정보 조회
    const machine = await getMachineById(machineId);

    return NextResponse.json(machine);
  } catch (error) {
    console.error("Failed to fetch machine:", error);

    // 머신을 찾을 수 없는 경우
    if (
      error instanceof Error &&
      error.message === "머신을 찾을 수 없습니다."
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/machines/[id] - 머신 삭제
export async function DELETE(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const params = await segmentData.params;
    const { id: machineId } = params;
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    if (!machineId) {
      return NextResponse.json(
        {
          ok: false,
          error: "머신 ID가 필요합니다.",
        },
        { status: 400 }
      );
    }

    // 먼저 머신 존재 여부 확인
    await getMachineById(machineId);

    // 머신 삭제 (관련 이미지도 함께 삭제됨 - cascade)
    await prisma.machine.delete({
      where: {
        id: machineId,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "머신이 성공적으로 삭제되었습니다.",
    });
  } catch (error) {
    console.error("Failed to delete machine:", error);

    // 머신을 찾을 수 없는 경우
    if (
      error instanceof Error &&
      error.message === "머신을 찾을 수 없습니다."
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}