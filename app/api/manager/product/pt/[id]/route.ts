import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextRequest, NextResponse } from "next/server";
import {
  getPtProductDetail,
  stopOrDeletePtProduct,
} from "@/app/services/manager/product.service";

type Params = Promise<{ id: string }>;

export const GET = async (
  _request: NextRequest,
  segmentData: { params: Params }
) => {
  try {
    // 세션 확인
    const sessionOrResponse = await getSessionOrReturn401();

    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    // 매니저 권한 확인
    if (sessionOrResponse.role !== "MANAGER") {
      return NextResponse.json(
        { error: "매니저 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const params = await segmentData.params;
    const { id } = params;

    // 서비스 함수 호출
    const product = await getPtProductDetail(id, sessionOrResponse.roleId);

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching PT product detail:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
};

export const PUT = async (
  _request: NextRequest,
  segmentData: { params: Params }
) => {
  try {
    // 세션 확인
    const sessionOrResponse = await getSessionOrReturn401();

    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    // 매니저 권한 확인
    if (sessionOrResponse.role !== "MANAGER") {
      return NextResponse.json(
        { error: "매니저 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const params = await segmentData.params;
    const { id } = params;

    // 서비스 함수 호출 - 판매 중지 또는 삭제
    const result = await stopOrDeletePtProduct(id, sessionOrResponse.roleId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating PT product:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
};
