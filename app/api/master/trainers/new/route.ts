import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextRequest, NextResponse } from "next/server";
import {
  searchMembersForTrainerConversion,
  convertMemberToTrainer,
} from "@/app/services/master/master-trainer.service";
import { logApiError } from "@/app/services/error/error-logging.service";

// 트레이너 변환용 회원 검색
export const GET = async (request: NextRequest) => {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  const session = sessionOrResponse;

  // 매니저 권한 확인
  if (session.role !== "MANAGER" && sessionOrResponse.role !== "MASTER") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;

    const members = await searchMembersForTrainerConversion(search);
    return NextResponse.json(members);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_TRAINER_SEARCH",
      userId: session.id,
      metadata: {
        action: "searchMembersForTrainerConversion",
        search: new URL(request.url).searchParams.get("search") || undefined,
      },
      tags: ["api", "trainer", "search"],
    });

    return NextResponse.json(
      { error: "회원 검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
};

// 회원을 트레이너로 변환
export const POST = async (request: NextRequest) => {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  const session = sessionOrResponse;

  // 매니저 권한 확인
  if (session.role !== "MANAGER" && sessionOrResponse.role !== "MASTER") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId, realname, levelId, fitnessCenterId } = body;

    // 입력 검증
    if (!userId || !realname) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    // realname 검증
    if (typeof realname !== "string" || realname.trim().length < 2) {
      return NextResponse.json(
        { error: "실명은 최소 2자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    // levelId 검증 (선택사항이지만 제공된 경우 검증)
    if (levelId && (typeof levelId !== "string" || levelId.trim() === "")) {
      return NextResponse.json(
        { error: "올바르지 않은 트레이너 레벨입니다." },
        { status: 400 }
      );
    }

    const result = await convertMemberToTrainer(userId, {
      realname: realname.trim(),
      levelId: levelId?.trim() || undefined,
      fitnessCenterId: fitnessCenterId || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    await logApiError(request, error as Error, {
      errorCode: "API_TRAINER_CONVERT",
      userId: session.id,
      metadata: {
        action: "convertMemberToTrainer",
      },
      tags: ["api", "trainer", "conversion"],
    });

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "트레이너 변환 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
};
