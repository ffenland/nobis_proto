import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { createPtPayment, updatePtPayment } from "@/app/services/trainer/pt.service";

type Params = Promise<{ id: string }>;

export async function POST(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    // TRAINER만 접근 가능
    if (sessionOrResponse.role !== "TRAINER") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const params = await segmentData.params;
    const { id: ptId } = params;

    const body = await request.json();
    const { method, amount, discount, state, paidAt, notes } = body;

    // 필수 필드 검증
    if (!method || amount === undefined || discount === undefined || !state) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다" },
        { status: 400 }
      );
    }

    // 결제 상태 검증
    if (state !== "COMPLETED" && state !== "PENDING") {
      return NextResponse.json(
        { error: "잘못된 결제 상태입니다" },
        { status: 400 }
      );
    }

    // 결제 정보 생성
    const payment = await createPtPayment({
      ptId,
      method,
      amount,
      discount,
      state,
      paidAt: state === "COMPLETED" ? (paidAt || new Date()) : undefined,
      notes: notes || "",
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error("PT 결제 정보 생성 실패:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    // TRAINER만 접근 가능
    if (sessionOrResponse.role !== "TRAINER") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { paymentId, method, amount, discount, state, paidAt, notes } = body;

    // 필수 필드 검증
    if (!paymentId || !method || amount === undefined || discount === undefined || !state) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다" },
        { status: 400 }
      );
    }

    // 결제 상태 검증
    if (state !== "COMPLETED" && state !== "PENDING") {
      return NextResponse.json(
        { error: "잘못된 결제 상태입니다" },
        { status: 400 }
      );
    }

    // 결제 정보 업데이트
    const payment = await updatePtPayment(paymentId, {
      method,
      amount,
      discount,
      state,
      paidAt: state === "COMPLETED" ? (paidAt || new Date()) : undefined,
      notes: notes || "",
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error("PT 결제 정보 수정 실패:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}