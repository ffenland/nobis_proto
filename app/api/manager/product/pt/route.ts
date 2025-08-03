// app/api/manager/product/pt/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import {
  createPtProductService,
  getTrainersForSelectionService,
  IPtProductCreateData,
} from "@/app/lib/services/product.service";

export async function GET() {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "MANAGER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const trainers = await getTrainersForSelectionService();
    return NextResponse.json(trainers);
  } catch (error) {
    console.error("트레이너 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "MANAGER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();

    if (
      !body.trainerIds ||
      !Array.isArray(body.trainerIds) ||
      body.trainerIds.length === 0
    ) {
      return NextResponse.json(
        { error: "최소 한 명의 트레이너를 선택해주세요." },
        { status: 400 }
      );
    }

    const createData: IPtProductCreateData = {
      title: body.title,
      price: Number(body.price),
      description: body.description,
      totalCount: Number(body.totalCount),
      time: Number(body.time),
      onSale: Boolean(body.onSale),
      openedAt: new Date(body.openedAt),
      closedAt: new Date(body.closedAt),
      trainerIds: body.trainerIds,
    };

    const result = await createPtProductService(createData);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error("PT Product 생성 API 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
