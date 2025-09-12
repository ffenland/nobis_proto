import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getTrainerById, updateTrainer } from "@/app/services/mananger/manager-trainer.service";

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
    const { level, fitnessCenterId } = body;

    // 입력 검증
    if (level && !['JUNIOR', 'ASSOCIATE', 'SENIOR', 'MASTER'].includes(level)) {
      return NextResponse.json(
        { error: "Invalid trainer level" }, 
        { status: 400 }
      );
    }

    const updatedTrainer = await updateTrainer(id, {
      level,
      fitnessCenterId: fitnessCenterId === "" ? null : fitnessCenterId,
    });

    return NextResponse.json(updatedTrainer);
  } catch (error) {
    console.error("Failed to update trainer:", error);
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}