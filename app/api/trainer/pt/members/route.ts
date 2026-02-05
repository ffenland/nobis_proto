import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { getMembersForPtCreation } from "@/app/services/trainer/pt.service";
import { logApiError } from "@/app/services/error/error-logging.service";

// PT 생성용 Member 목록 조회 및 검색
export const GET = async (request: NextRequest) => {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "TRAINER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;

    const members = await getMembersForPtCreation(search);
    return NextResponse.json(members);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_TRAINER_PT_MEMBERS_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "getMembersForPtCreation",
      },
      tags: ["api", "trainer", "pt", "members"],
    });

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "회원 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
};
