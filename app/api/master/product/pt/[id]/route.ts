import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextRequest, NextResponse } from "next/server";
import {
  getPtProductDetail,
  stopOrDeletePtProduct,
  updatePtProductTrainerLevels,
  updatePtProductDescription,
} from "@/app/services/master/product.service";
import { logApiError } from "@/app/services/error/error-logging.service";

type Params = Promise<{ id: string }>;

export const GET = async (
  request: NextRequest,
  segmentData: { params: Params }
) => {
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
    const params = await segmentData.params;
    const { id } = params;

    const product = await getPtProductDetail(id);

    return NextResponse.json(product);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_PT_PRODUCT_DETAIL_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getPtProductDetail",
      },
      tags: ["api", "pt-product", "master"],
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
};

export const PATCH = async (
  request: NextRequest,
  segmentData: { params: Params }
) => {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json(
      { error: "마스터 권한이 필요합니다." },
      { status: 403 }
    );
  }

  try {
    const params = await segmentData.params;
    const { id } = params;

    // 요청 본문 파싱
    const body = await request.json();

    // description 업데이트
    if (body.description !== undefined) {
      if (typeof body.description !== "string") {
        return NextResponse.json(
          { error: "설명은 문자열이어야 합니다." },
          { status: 400 }
        );
      }

      await updatePtProductDescription(
        id,
        body.description,
        sessionOrResponse.roleId
      );

      return NextResponse.json({ success: true, message: "설명이 수정되었습니다." });
    }

    // trainerLevelIds 업데이트
    if (body.trainerLevelIds && Array.isArray(body.trainerLevelIds)) {
      await updatePtProductTrainerLevels(
        id,
        body.trainerLevelIds,
        sessionOrResponse.roleId
      );

      return NextResponse.json({ success: true, message: "트레이너 레벨이 수정되었습니다." });
    }

    // 둘 다 없으면 에러
    return NextResponse.json(
      { error: "수정할 필드를 지정해주세요." },
      { status: 400 }
    );
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_PT_PRODUCT_UPDATE_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "updatePtProduct",
      },
      tags: ["api", "pt-product", "master"],
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
};

// 판매 중지/삭제
export const PUT = async (
  request: NextRequest,
  segmentData: { params: Params }
) => {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json(
      { error: "마스터 권한이 필요합니다." },
      { status: 403 }
    );
  }

  try {
    const params = await segmentData.params;
    const { id } = params;

    const result = await stopOrDeletePtProduct(id, sessionOrResponse.roleId);

    return NextResponse.json({
      success: true,
      action: result.action,
      message: result.action === "deleted" ? "상품이 삭제되었습니다." : "판매가 중지되었습니다.",
    });
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_PT_PRODUCT_STOP_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "stopOrDeletePtProduct",
      },
      tags: ["api", "pt-product", "master"],
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
};
