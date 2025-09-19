import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextResponse } from "next/server";
import { getPtProductsForTrainer } from "@/app/services/trainer/pt.service";

// 트레이너의 PT 상품 목록 조회
export const GET = async () => {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  try {
    const session = sessionOrResponse;
    const ptProducts = await getPtProductsForTrainer(session.roleId);
    return NextResponse.json(ptProducts);
  } catch (error) {
    console.error("Error fetching PT products for trainer:", error);
    
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