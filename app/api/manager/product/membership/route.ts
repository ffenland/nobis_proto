// app/api/manager/product/membership/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import {
  createMembershipProductService,
  IMembershipProductCreateData,
} from "@/app/lib/services/product.service";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "MANAGER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const createData: IMembershipProductCreateData = {
      title: body.title,
      price: Number(body.price),
      description: body.description,
      totalCount: Number(body.totalCount),
      onSale: Boolean(body.onSale),
      openedAt: new Date(body.openedAt),
      closedAt: new Date(body.closedAt),
    };

    const result = await createMembershipProductService(createData);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error("Membership Product 생성 API 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
