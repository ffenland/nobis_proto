import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextRequest, NextResponse } from "next/server";
import {
  getAllTrainerLevels,
  createTrainerLevel,
} from "@/app/services/master/master-trainer.service";
import { logApiError } from "@/app/services/error/error-logging.service";

export async function GET(request: NextRequest) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const levels = await getAllTrainerLevels();
    return NextResponse.json(levels);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_TRAINER_LEVEL_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getAllTrainerLevels",
      },
      tags: ["api", "trainer-level", "master"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, displayTitle, trainerIds } = body;

    if (!title || !displayTitle) {
      return NextResponse.json(
        { error: "레벨명과 표시명은 필수입니다." },
        { status: 400 }
      );
    }

    // 영문 대문자 검증
    if (!/^[A-Z_]+$/.test(title)) {
      return NextResponse.json(
        {
          error: "레벨명은 영문 대문자와 언더스코어(_)만 사용 가능합니다.",
        },
        { status: 400 }
      );
    }

    const newLevel = await createTrainerLevel({
      title,
      displayTitle,
      trainerIds,
    });

    return NextResponse.json(newLevel, { status: 201 });
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_TRAINER_LEVEL_002",
      userId: sessionOrResponse.id,
      metadata: {
        action: "createTrainerLevel",
      },
      tags: ["api", "trainer-level", "master", "create"],
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
