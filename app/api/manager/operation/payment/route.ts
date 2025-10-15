import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { logApiError } from "@/app/services/error/error-logging.service";
import { getUnpaidPtPayments } from "@/app/services/manager/operations.service";

export async function GET(request: NextRequest) {
  // 1. 세션 확인 (필수)
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 2. 역할별 권한 확인 - MANAGER만 접근 가능
  if (sessionOrResponse.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. 비즈니스 로직 (try-catch 내부)
  try {
    const data = await getUnpaidPtPayments(sessionOrResponse.roleId);
    return NextResponse.json(data);
  } catch (error) {
    // 4. 에러 로깅 (필수)
    await logApiError(request, error as Error, {
      errorCode: "OPERATION_001",
      userId: sessionOrResponse.id,
      metadata: { action: "getUnpaidPtPayments" },
      tags: ["operations", "payment", "unpaid"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
