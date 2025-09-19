import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextResponse } from "next/server";
import {
  searchMembersForTrainerConversion,
  convertMemberToTrainer,
} from "@/app/services/manager/manager-trainer.service";

// 트레이너 변환용 회원 검색
export const GET = async (request: Request) => {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  try {
    const session = sessionOrResponse;

    // 매니저 권한 확인
    if (session.role !== "MANAGER") {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;

    const members = await searchMembersForTrainerConversion(search);
    return NextResponse.json(members);
  } catch (error) {
    console.error("Error searching members for trainer conversion:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "회원 검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
};

// 회원을 트레이너로 변환
export const POST = async (request: Request) => {
  const sessionOrResponse = await getSessionOrReturn401();

  if (sessionOrResponse instanceof NextResponse) {
    return sessionOrResponse;
  }

  try {
    const session = sessionOrResponse;

    // 매니저 권한 확인
    if (session.role !== "MANAGER") {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, level, fitnessCenterId } = body;

    // 입력 검증
    if (!userId || !level) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    const validLevels = ['JUNIOR', 'ASSOCIATE', 'SENIOR', 'MASTER'];
    if (!validLevels.includes(level)) {
      return NextResponse.json(
        { error: "올바르지 않은 트레이너 레벨입니다." },
        { status: 400 }
      );
    }

    const result = await convertMemberToTrainer(userId, {
      level,
      fitnessCenterId: fitnessCenterId || undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error converting member to trainer:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "트레이너 변환 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
};