import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextRequest, NextResponse } from "next/server";
import {
  getPtProductDetail,
  stopOrDeletePtProduct,
  updatePtProductTrainerLevels,
  updatePtProductDescription,
} from "@/app/services/manager/product.service";
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

  if (sessionOrResponse.role !== "MANAGER") {
    return NextResponse.json(
      { error: "매니저 권한이 필요합니다." },
      { status: 403 }
    );
  }

  try {
    const params = await segmentData.params;
    const { id } = params;

    const product = await getPtProductDetail(id, sessionOrResponse.roleId);

    return NextResponse.json(product);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_PT_PRODUCT_DETAIL_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getPtProductDetail",
      },
      tags: ["api", "pt-product", "manager"],
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

  if (sessionOrResponse.role !== "MANAGER") {
    return NextResponse.json(
      { error: "매니저 권한이 필요합니다." },
      { status: 403 }
    );
  }

  try {
    const params = await segmentData.params;
    const { id } = params;

    // 요청 본문 파싱
    const body = await request.json();

    let product;

    // description 업데이트
    if (body.description !== undefined) {
      if (typeof body.description !== "string") {
        return NextResponse.json(
          { error: "설명은 문자열이어야 합니다." },
          { status: 400 }
        );
      }

      product = await updatePtProductDescription(
        id,
        body.description,
        sessionOrResponse.roleId
      );
    }

    // trainerLevelIds 업데이트
    if (body.trainerLevelIds && Array.isArray(body.trainerLevelIds)) {
      product = await updatePtProductTrainerLevels(
        id,
        body.trainerLevelIds,
        sessionOrResponse.roleId
      );
    }

    // 둘 다 없으면 에러
    if (!body.description && !body.trainerLevelIds) {
      return NextResponse.json(
        { error: "수정할 필드를 지정해주세요." },
        { status: 400 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_PT_PRODUCT_UPDATE_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "updatePtProduct",
      },
      tags: ["api", "pt-product", "manager"],
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

// 판매 중지/삭제는 별도의 DELETE 엔드포인트로 처리 (향후 추가 가능)
// 현재는 프론트에서 stopOrDeletePtProduct를 직접 호출하는 방식 유지
