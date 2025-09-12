import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { 
  getEquipmentBrands,
  createEquipmentBrand,
  type CreateEquipmentBrandInput 
} from "@/app/services/fitness-center/equipment.service";

export async function GET() {
  try {
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    const brands = await getEquipmentBrands();
    return NextResponse.json(brands);
  } catch (error) {
    console.error("Equipment 브랜드 목록 조회 실패:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    // MANAGER만 브랜드 생성 가능
    if (sessionOrResponse.role !== "MANAGER") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body: CreateEquipmentBrandInput = await request.json();

    // 입력 검증
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: "브랜드명은 필수입니다" },
        { status: 400 }
      );
    }

    const brand = await createEquipmentBrand({
      name: body.name.trim(),
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (error: any) {
    console.error("Equipment 브랜드 생성 실패:", error);
    
    // 중복 이름 에러 처리 (스키마에 unique 제약이 있는 경우)
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "이미 존재하는 브랜드명입니다" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}