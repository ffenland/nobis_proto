import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { logApiError } from "@/app/services/error/error-logging.service";
import { getTodayLessonInfoForMaster } from "@/app/services/master/master-lesson.service";

export async function GET(request: NextRequest) {
  // 1. 세션 확인 (필수)
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  // 2. 역할별 권한 확인 (필수)
  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. 비즈니스 로직 (try-catch 내부)
  try {
    // URL query parameter에서 date 추출 (optional)
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || undefined;

    const data = await getTodayLessonInfoForMaster(
      sessionOrResponse.roleId,
      date
    );
    return NextResponse.json(data);
  } catch (error) {
    // 4. 에러 로깅 (필수)
    await logApiError(request, error as Error, {
      errorCode: "API_MASTER_LESSONS_001",
      userId: sessionOrResponse.id,
      metadata: { action: "getLessonInfo" },
      tags: ["api", "master", "lessons"],
    });

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
