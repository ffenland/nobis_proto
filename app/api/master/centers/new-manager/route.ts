import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextRequest, NextResponse } from "next/server";
import {
  searchUsersForManagerConversion,
  convertTrainerToManager,
} from "@/app/services/master/master-trainer.service";
import { logApiError } from "@/app/services/error/error-logging.service";

// 매니저 변환용 사용자 검색
export const GET = async (request: NextRequest) => {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;

    const users = await searchUsersForManagerConversion(search);
    return NextResponse.json(users);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_MASTER_CONVERT_001",
      userId: sessionOrResponse.id,
      metadata: {
        action: "searchUsersForManagerConversion",
      },
      tags: ["api", "master", "user-search"],
    });

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "사용자 검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
};

// 트레이너를 매니저로 변환
export const POST = async (request: NextRequest) => {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  if (sessionOrResponse.role !== "MASTER") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId, fitnessCenterIds } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    const result = await convertTrainerToManager(userId, fitnessCenterIds);

    return NextResponse.json(result);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_MASTER_CONVERT_002",
      userId: sessionOrResponse.id,
      metadata: {
        action: "convertTrainerToManager",
      },
      tags: ["api", "master", "trainer-conversion"],
    });

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "매니저 변환 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
};
