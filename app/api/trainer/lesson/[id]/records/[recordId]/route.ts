import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { 
  updateLessonRecordSets, 
  deleteLessonRecordItem 
} from "@/app/services/trainer/lesson.service";

type Params = Promise<{ id: string; recordId: string }>;

export async function PUT(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const session = await getSession();
    if (!session?.id || session.role !== "TRAINER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await segmentData.params;
    const { id: lessonId, recordId } = params;

    const body = await request.json();
    const { sets } = body;

    if (!sets || !Array.isArray(sets)) {
      return NextResponse.json({ error: "Invalid sets data" }, { status: 400 });
    }

    const result = await updateLessonRecordSets(
      recordId,
      lessonId,
      session.roleId,
      sets
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to update lesson record:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const session = await getSession();
    if (!session?.id || session.role !== "TRAINER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await segmentData.params;
    const { id: lessonId, recordId } = params;

    const result = await deleteLessonRecordItem(
      recordId,
      lessonId,
      session.roleId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to delete lesson record:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}