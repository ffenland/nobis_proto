import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import {
  getPendingPtDetail,
  updatePendingPt,
  confirmPtWithFirstLesson,
  UpdatePendingPtInput,
  CreateFirstLessonInput,
} from "@/app/services/trainer/pt.service";

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "TRAINER") {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    const params = await segmentData.params;
    const { id } = params;

    const ptDetail = await getPendingPtDetail(id, session.roleId);

    return NextResponse.json(ptDetail);
  } catch (error) {
    console.error("Pending PT 세부 정보 조회 실패:", error);
    return NextResponse.json(
      { error: "PT 정보를 불러올 수 없습니다." },
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
    if (!session || session.role !== "TRAINER") {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    const params = await segmentData.params;
    const { id } = params;
    const body = await request.json();

    const updateData: UpdatePendingPtInput = {
      description: body.description,
      goals: body.goals,
      contractImageIds: body.contractImageIds,
    };

    const result = await updatePendingPt(id, session.roleId, updateData);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Pending PT 업데이트 실패:", error);
    return NextResponse.json(
      { error: "PT 정보 업데이트에 실패했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "TRAINER") {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    const params = await segmentData.params;
    const { id } = params;
    const body = await request.json();

    const { scheduledAt, endAt, memo } = body;

    if (!scheduledAt || !endAt) {
      return NextResponse.json(
        { error: "레슨 일정과 종료 시간은 필수입니다." },
        { status: 400 }
      );
    }

    const lessonData: CreateFirstLessonInput = {
      scheduledAt,
      endAt,
      memo,
    };

    const result = await confirmPtWithFirstLesson(id, session.roleId, lessonData);

    return NextResponse.json(result);
  } catch (error) {
    console.error("PT 확정 및 첫 레슨 생성 실패:", error);
    return NextResponse.json(
      { error: "PT 확정에 실패했습니다." },
      { status: 500 }
    );
  }
}