// app/api/master/trainers/off/route.ts
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import {
  getTrainerOffs,
  updateTrainerOffState,
  UpdateTrainerOffStateInput,
} from "@/app/services/master/master-trainer.service";
import { logApiError } from "@/app/services/error/error-logging.service";

export async function GET(request: NextRequest) {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json(
      { error: "Master 권한이 필요합니다." },
      { status: 403 }
    );
  }

  try {
    const trainerOffs = await getTrainerOffs(sessionOrResponse.roleId);

    return NextResponse.json(trainerOffs);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_MASTER_TRAINER_OFF_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getTrainerOffs",
      },
      tags: ["api", "trainer-off", "master"],
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
    return NextResponse.json(
      { error: "Master 권한이 필요합니다." },
      { status: 403 }
    );
  }

  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json(
      { error: "Master 권한이 필요합니다." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { id, state }: UpdateTrainerOffStateInput = body;

    if (!id || !state) {
      return NextResponse.json(
        { error: "ID와 상태값은 필수입니다." },
        { status: 400 }
      );
    }

    if (!["PENDING", "CONFIRMED", "REJECTED"].includes(state)) {
      return NextResponse.json(
        { error: "올바르지 않은 상태값입니다." },
        { status: 400 }
      );
    }

    const result = await updateTrainerOffState(sessionOrResponse.roleId, {
      id,
      state,
    });

    return NextResponse.json(result);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_MASTER_TRAINER_OFF_002",
      userId: sessionOrResponse.id,
      metadata: {
        action: "updateTrainerOffState",
      },
      tags: ["api", "trainer-off", "master", "update"],
    });

    if (error instanceof Error && error.message.includes("권한이 없거나")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
