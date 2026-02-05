import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { logApiError } from "@/app/services/error/error-logging.service";
import {
  getMasterFitnessCenterInfo,
  editMasterFitnessCenterInfo,
} from "@/app/services/master/master-center.service";

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  // 1. 세션 확인 (필수)
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 2. 역할별 권한 확인
  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json(
      { error: "Master 권한이 필요합니다." },
      { status: 403 }
    );
  }

  // 3. 비즈니스 로직
  try {
    const params = await segmentData.params;
    const { id: centerId } = params;

    const center = await getMasterFitnessCenterInfo({
      centerId,
      masterId: sessionOrResponse.roleId,
    });

    return NextResponse.json(center);
  } catch (error) {
    // 4. 에러 로깅 (필수)
    await logApiError(request, error as Error, {
      errorCode: "API_MASTER_CENTER_GET",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getMasterFitnessCenter",
        centerId: (await segmentData.params).id,
      },
      tags: ["api", "master", "centers"],
    });

    return NextResponse.json(
      { error: "센터 정보를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  segmentData: { params: Params }
) {
  // 1. 세션 확인 (필수)
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 2. 역할별 권한 확인
  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json(
      { error: "Master 권한이 필요합니다." },
      { status: 403 }
    );
  }

  // 3. 비즈니스 로직
  try {
    const params = await segmentData.params;
    const { id: centerId } = params;
    const body = await request.json();

    const updatedCenter = await editMasterFitnessCenterInfo({
      centerId,
      masterId: sessionOrResponse.roleId,
      address: body.address,
      addressDetail: body.addressDetail,
      postCode: body.postCode,
      phone: body.phone,
      description: body.description,
      openingHours: body.openingHours,
    });

    return NextResponse.json(updatedCenter);
  } catch (error) {
    // 4. 에러 로깅 (필수)
    await logApiError(request, error as Error, {
      errorCode: "API_MASTER_CENTER_PATCH",
      userId: sessionOrResponse.id,
      metadata: {
        action: "editMasterFitnessCenter",
        centerId: (await segmentData.params).id,
      },
      tags: ["api", "master", "centers", "edit"],
    });

    return NextResponse.json(
      { error: "센터 정보 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
