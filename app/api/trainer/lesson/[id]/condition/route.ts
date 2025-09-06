import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import {
  createLessonCondition,
  getLessonCondition,
  deleteLessonCondition,
  type CreateLessonConditionInput,
} from "@/app/services/trainer/lesson.service";

type Params = Promise<{ id: string }>;

// 컨디션 기록 조회
export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const sessionOrResponse = await getSessionOrReturn401();

    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    const params = await segmentData.params;
    const { id: lessonId } = params;

    const condition = await getLessonCondition(lessonId, sessionOrResponse.roleId);
    
    if (!condition) {
      return NextResponse.json(
        { error: "레슨을 찾을 수 없거나 권한이 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(condition);
  } catch (error) {
    console.error("Get lesson condition error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// 컨디션 기록 생성
export async function POST(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const sessionOrResponse = await getSessionOrReturn401();

    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    const params = await segmentData.params;
    const { id: lessonId } = params;

    const body: CreateLessonConditionInput = await request.json();

    const result = await createLessonCondition(
      lessonId,
      sessionOrResponse.roleId,
      body
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Create lesson condition error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// 컨디션 기록 삭제
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
    const { id: lessonId } = params;

    const result = await deleteLessonCondition(
      lessonId,
      sessionOrResponse.roleId
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Delete lesson condition error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}