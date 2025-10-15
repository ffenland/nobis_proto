import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { updateTrainerLevel } from "@/app/services/manager/manager-trainer.service";
import { logApiError } from "@/app/services/error/error-logging.service";

type Params = Promise<{ id: string }>;

export async function PUT(
  request: NextRequest,
  segmentData: { params: Params }
) {
  const params = await segmentData.params;
  const { id: levelId } = params;

  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, displayTitle, trainerIds } = body;

    // 영문 대문자 검증 (title이 제공된 경우)
    if (title && !/^[A-Z_]+$/.test(title)) {
      return NextResponse.json(
        {
          error:
            "레벨명은 영문 대문자와 언더스코어(_)만 사용 가능합니다.",
        },
        { status: 400 }
      );
    }

    const updatedLevel = await updateTrainerLevel(levelId, {
      title,
      displayTitle,
      trainerIds,
    });

    return NextResponse.json(updatedLevel);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_TRAINER_LEVEL_003",
      userId: sessionOrResponse.id,
      metadata: {
        action: "updateTrainerLevel",
        levelId,
      },
      tags: ["api", "trainer-level", "manager", "update"],
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
