import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import {
  getPendingPtDetail,
  updatePendingPt,
  confirmPtWithFirstLesson,
  UpdatePendingPtInput,
  CreateFirstLessonInput,
} from "@/app/services/trainer/pt.service";
import { updateMemberProfile } from "@/app/services/member/profile.service";

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

    const ptDetail = await getPendingPtDetail(id, sessionOrResponse.roleId);

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

    // member의 realname이 필요한 경우 먼저 업데이트
    if (body.memberUserId && body.memberRealname) {
      await updateMemberProfile(body.memberUserId, {
        realname: body.memberRealname,
      });
    }

    const updateData: UpdatePendingPtInput = {
      description: body.description,
      goals: body.goals,
      contractImageIds: body.contractImageIds,
    };

    const result = await updatePendingPt(id, sessionOrResponse.roleId, updateData);

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

    const result = await confirmPtWithFirstLesson(
      id,
      sessionOrResponse.roleId,
      lessonData
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("PT 확정 및 첫 레슨 생성 실패:", error);
    return NextResponse.json(
      { error: "PT 확정에 실패했습니다." },
      { status: 500 }
    );
  }
}