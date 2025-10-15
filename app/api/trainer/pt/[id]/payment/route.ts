import { NextRequest, NextResponse } from "next/server";
import {
  getPtPaymentForEdit,
  updatePtPaymentWithAudit,
} from "@/app/services/trainer/pt.service";
import { logApiError } from "@/app/services/error/error-logging.service";
import { getSessionOrReturn401 } from "@/app/lib/session";

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  // 세션 처리를 먼저 수행
  const sessionOrResponse = await getSessionOrReturn401();

  // 401 응답인 경우 바로 반환
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 권한 확인 - TRAINER만 접근 가능
  if (sessionOrResponse.role !== "TRAINER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const params = await segmentData.params;
    const { id } = params;

    const payment = await getPtPaymentForEdit(id, sessionOrResponse.roleId);
    return NextResponse.json(payment);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "PT_PAYMENT_GET_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getPaymentForEdit",
      },
      tags: ["api", "payment", "trainer"],
    });

    return NextResponse.json(
      { error: "Failed to fetch payment information" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  segmentData: { params: Params }
) {
  // 세션 처리를 먼저 수행
  const sessionOrResponse = await getSessionOrReturn401();

  // 401 응답인 경우 바로 반환
  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 권한 확인 - TRAINER만 접근 가능
  if (sessionOrResponse.role !== "TRAINER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();

    const {
      paymentId,
      amount,
      discount,
      deduction,
      refundAmount,
      method,
      state,
      paidAt,
      refundedAt,
      notes,
      reason,
    } = body;

    if (!paymentId || !reason) {
      return NextResponse.json(
        { error: "Payment ID and reason are required" },
        { status: 400 }
      );
    }

    const trainerName = sessionOrResponse.id;

    const updatedPayment = await updatePtPaymentWithAudit({
      paymentId,
      trainerId: sessionOrResponse.roleId,
      trainerName,
      updateData: {
        amount,
        discount,
        deduction,
        refundAmount,
        method,
        state,
        paidAt: paidAt ? new Date(paidAt) : undefined,
        refundedAt: refundedAt ? new Date(refundedAt) : undefined,
        notes,
      },
      reason,
    });

    return NextResponse.json(updatedPayment);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "PT_PAYMENT_UPDATE_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "updatePayment",
      },
      tags: ["api", "payment", "trainer", "critical"],
    });

    const errorMessage = (error as Error).message || "Failed to update payment";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
