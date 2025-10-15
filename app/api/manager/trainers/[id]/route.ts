import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import {
  getTrainerById,
  updateTrainer,
} from "@/app/services/manager/manager-trainer.service";

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const session = await getSession();

    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = await segmentData.params;
    const { id } = params;

    const trainer = await getTrainerById(id);

    if (!trainer) {
      return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
    }

    return NextResponse.json(trainer);
  } catch (error) {
    console.error("Failed to get trainer:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const session = await getSession();

    if (!session?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = await segmentData.params;
    const { id } = params;

    const body = await request.json();
    const { fitnessCenterId } = body;

    // 피트니스 센터만 업데이트 가능 (레벨은 레벨 관리 페이지에서만 수정)
    const updatedTrainer = await updateTrainer(id, {
      fitnessCenterId: fitnessCenterId === "" ? null : fitnessCenterId,
    });

    return NextResponse.json(updatedTrainer);
  } catch (error) {
    console.error("Failed to update trainer:", error);

    // 구체적인 에러 메시지 반환
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
