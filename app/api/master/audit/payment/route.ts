import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { logApiError } from "@/app/services/error/error-logging.service";
import { getPaymentsByMonth } from "@/app/services/master/audit.service";

export async function GET(request: NextRequest) {
  // 1. 세션 확인 (필수)
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 2. 역할별 권한 확인 - MASTER만 접근 가능
  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. 비즈니스 로직 (try-catch 내부)
  try {
    // URL query parameter에서 date 추출 (YYYYMM 형식)
    const url = new URL(request.url);
    const dateParam = url.searchParams.get("date");

    // date가 없으면 현재 월 사용
    let yearMonth: string;
    if (dateParam) {
      // YYYYMM 형식 검증
      if (!/^\d{6}$/.test(dateParam)) {
        return NextResponse.json(
          { error: "Invalid date format. Use YYYYMM (e.g., 202502)" },
          { status: 400 }
        );
      }
      yearMonth = dateParam;
    } else {
      // 현재 월 계산 (UTC 기준)
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = String(now.getUTCMonth() + 1).padStart(2, "0");
      yearMonth = `${year}${month}`;
    }

    const data = await getPaymentsByMonth(yearMonth);
    return NextResponse.json(data);
  } catch (error) {
    // 4. 에러 로깅 (필수)
    await logApiError(request, error as Error, {
      errorCode: "AUDIT_PAYMENT_001",
      userId: sessionOrResponse.id,
      metadata: { action: "getPaymentsByMonth" },
      tags: ["audit", "payment", "master"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
