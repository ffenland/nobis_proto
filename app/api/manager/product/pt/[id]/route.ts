// app/api/manager/product/pt/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import {
  getPtProductDetailService,
  updatePtProductService,
  IPtProductDetail,
} from "@/app/lib/services/product.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "MANAGER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id } = await params;
    const ptProduct = await getPtProductDetailService(id);

    if (!ptProduct) {
      return NextResponse.json(
        { error: "PT 상품을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(ptProduct);
  } catch (error) {
    console.error("PT 상품 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "MANAGER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // 기존 데이터 조회
    const originalData = await getPtProductDetailService(id);
    if (!originalData) {
      return NextResponse.json(
        { error: "수정하려는 PT 상품을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 수정 데이터 검증
    if (
      body.trainerIds &&
      (!Array.isArray(body.trainerIds) || body.trainerIds.length === 0)
    ) {
      return NextResponse.json(
        { error: "최소 한 명의 트레이너를 선택해주세요." },
        { status: 400 }
      );
    }

    // 수정 데이터 준비
    const updateData: Partial<IPtProductDetail> = {
      price: body.price ? Number(body.price) : undefined,
      description: body.description,
      totalCount: body.totalCount ? Number(body.totalCount) : undefined,
      time: body.time ? Number(body.time) : undefined,
      onSale: body.onSale !== undefined ? Boolean(body.onSale) : undefined,
      openedAt: body.openedAt ? new Date(body.openedAt) : undefined,
      closedAt: body.closedAt ? new Date(body.closedAt) : undefined,
      trainerIds: body.trainerIds,
    };

    const result = await updatePtProductService(id, originalData, updateData);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("PT Product 수정 API 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
