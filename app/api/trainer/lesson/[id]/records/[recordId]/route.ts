import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import {
  updateLessonRecordSets,
  deleteLessonRecordItem,
} from "@/app/services/trainer/lesson.service";

type Params = Promise<{ id: string; recordId: string }>;

export async function PUT(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const sessionOrResponse = await getSessionOrReturn401();

    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
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
      sessionOrResponse.roleId,
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
    const sessionOrResponse = await getSessionOrReturn401();

    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    const params = await segmentData.params;
    const { id: lessonId, recordId } = params;

    const result = await deleteLessonRecordItem(
      recordId,
      lessonId,
      sessionOrResponse.roleId
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
