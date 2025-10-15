import { NextRequest, NextResponse } from "next/server";
import {
  getPtPauseInfo,
  pausePt,
} from "@/app/services/trainer/pt.service";
import { logApiError } from "@/app/services/error/error-logging.service";
import { getSessionOrReturn401 } from "@/app/lib/session";
import prisma from "@/app/lib/prisma";

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  // 세션 처리를 먼저 수행
  const sessionOrResponse = await getSessionOrReturn401();

  // 401 응답인 경우 바로 반환
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 권한 확인 - TRAINER만 접근 가능
  if (sessionOrResponse.role !== "TRAINER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const params = await segmentData.params;
    const { id } = params;

    const pauseInfo = await getPtPauseInfo(id, sessionOrResponse.roleId);
    return NextResponse.json(pauseInfo);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "PT_PAUSE_GET_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getPtPauseInfo",
      },
      tags: ["api", "pt", "pause", "trainer"],
    });

    return NextResponse.json(
      { error: "Failed to fetch PT pause information" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  segmentData: { params: Params }
) {
  // 세션 처리를 먼저 수행
  const sessionOrResponse = await getSessionOrReturn401();

  // 401 응답인 경우 바로 반환
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 권한 확인 - TRAINER만 접근 가능
  if (sessionOrResponse.role !== "TRAINER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const params = await segmentData.params;
    const { id } = params;
    const body = await request.json();
    const { startDate, endDate, reason } = body;

    // 입력값 검증
    if (!startDate || !endDate || !reason?.trim()) {
      return NextResponse.json(
        { error: "startDate, endDate, reason are required" },
        { status: 400 }
      );
    }

    // 트레이너 정보 조회 (username 가져오기)
    const trainer = await prisma.trainer.findUnique({
      where: { id: sessionOrResponse.roleId },
      select: {
        user: {
          select: {
            username: true,
          },
        },
      },
    });

    if (!trainer) {
      return NextResponse.json(
        { error: "Trainer not found" },
        { status: 404 }
      );
    }

    const result = await pausePt(
      id,
      sessionOrResponse.roleId,
      new Date(startDate),
      new Date(endDate),
      reason.trim(),
      sessionOrResponse.id,
      trainer.user.username
    );

    return NextResponse.json(result);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "PT_PAUSE_CREATE_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "createPtPause",
      },
      tags: ["api", "pt", "pause", "trainer", "create"],
    });

    const errorMessage =
      error instanceof Error ? error.message : "Failed to create pause";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
