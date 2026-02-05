import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { getPtProductsForTrainer } from "@/app/services/trainer/pt.service";
import { logApiError } from "@/app/services/error/error-logging.service";

// 트레이너의 PT 상품 목록 조회
export const GET = async (request: NextRequest) => {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  try {
    const ptProducts = await getPtProductsForTrainer(sessionOrResponse.roleId);
    return NextResponse.json(ptProducts);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_TRAINER_PT_PRODUCTS_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getPtProductsForTrainer",
      },
      tags: ["api", "trainer", "pt", "products"],
    });

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "PT 상품 목록을 불러올 수 없습니다." },
      { status: 500 }
    );
  }
};