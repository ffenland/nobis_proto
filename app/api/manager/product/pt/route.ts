import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import {
  createPtProduct,
  type CreatePtProductInput,
} from "@/app/services/manager/product.service";
import { TrainerLevel } from "@prisma/client";

// 신규 PtProduct 생성
export async function POST(request: NextRequest) {
  try {
    // 세션 검증 (매니저 권한 확인)
    const session = await getSessionOrReturn401();

    // 401 응답인 경우 그대로 반환
    if (session instanceof NextResponse) {
      return session;
    }

    // 매니저 권한 검증
    if (session.role !== "MANAGER") {
      return NextResponse.json(
        { error: "매니저만 접근할 수 있습니다." },
        { status: 403 }
      );
    }

    // 요청 데이터 파싱
    const body = await request.json();

    const {
      title,
      price,
      expiration_period,
      incentivePercent,
      description,
      totalCount,
      time,
      trainerLevels,
      openedAt,
      closedAt,
    } = body;

    // 기본 데이터 검증
    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "상품명을 입력해주세요." },
        { status: 400 }
      );
    }

    if (!price || typeof price !== "number" || price <= 0) {
      return NextResponse.json(
        { error: "올바른 가격을 입력해주세요." },
        { status: 400 }
      );
    }

    if (
      !expiration_period ||
      typeof expiration_period !== "number" ||
      expiration_period <= 0
    ) {
      return NextResponse.json(
        { error: "올바른 만료 기간을 입력해주세요." },
        { status: 400 }
      );
    }

    if (
      typeof incentivePercent !== "number" ||
      incentivePercent < 0 ||
      incentivePercent > 100
    ) {
      return NextResponse.json(
        { error: "인센티브는 0~100% 범위여야 합니다." },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "상품 설명을 입력해주세요." },
        { status: 400 }
      );
    }

    if (!totalCount || typeof totalCount !== "number" || totalCount <= 0) {
      return NextResponse.json(
        { error: "올바른 총 레슨 횟수를 입력해주세요." },
        { status: 400 }
      );
    }

    if (!time || typeof time !== "number" || time <= 0) {
      return NextResponse.json(
        { error: "올바른 레슨 시간을 입력해주세요." },
        { status: 400 }
      );
    }

    // TrainerLevel 검증
    if (!Array.isArray(trainerLevels)) {
      return NextResponse.json(
        { error: "트레이너 레벨을 선택해주세요." },
        { status: 400 }
      );
    }

    // TrainerLevel enum 값 검증
    const validTrainerLevels: TrainerLevel[] = [
      "JUNIOR",
      "ASSOCIATE",
      "SENIOR",
      "MASTER",
    ];
    const invalidLevels = trainerLevels.filter(
      (level) => !validTrainerLevels.includes(level)
    );

    if (invalidLevels.length > 0) {
      return NextResponse.json(
        { error: "유효하지 않은 트레이너 레벨이 포함되어 있습니다." },
        { status: 400 }
      );
    }

    // 날짜 검증 및 변환
    let parsedOpenedAt: Date | undefined;
    let parsedClosedAt: Date | undefined;

    if (openedAt) {
      parsedOpenedAt = new Date(openedAt);
      if (isNaN(parsedOpenedAt.getTime())) {
        return NextResponse.json(
          { error: "올바른 판매 시작일을 입력해주세요." },
          { status: 400 }
        );
      }
    }

    if (closedAt) {
      parsedClosedAt = new Date(closedAt);
      if (isNaN(parsedClosedAt.getTime())) {
        return NextResponse.json(
          { error: "올바른 판매 종료일을 입력해주세요." },
          { status: 400 }
        );
      }
    }

    // 시작일과 종료일 관계 검증
    if (parsedOpenedAt && parsedClosedAt && parsedOpenedAt >= parsedClosedAt) {
      return NextResponse.json(
        { error: "판매 종료일은 시작일보다 나중이어야 합니다." },
        { status: 400 }
      );
    }

    // 서비스 함수 호출을 위한 Input 준비
    const createInput: CreatePtProductInput = {
      title: title.trim(),
      price,
      expiration_period,
      incentivePercent,
      description: description.trim(),
      totalCount,
      time,
      trainerLevels,
      managerId: session.roleId,
      openedAt: parsedOpenedAt,
      closedAt: parsedClosedAt,
    };

    // PtProduct 생성
    const ptProduct = await createPtProduct(createInput);

    return NextResponse.json(ptProduct);
  } catch (error) {
    console.error("PtProduct 생성 오류:", error);

    // 비즈니스 로직 에러 (서비스에서 throw한 에러)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 예상치 못한 에러
    return NextResponse.json(
      { error: "PT 상품 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
