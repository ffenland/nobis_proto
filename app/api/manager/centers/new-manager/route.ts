import { getSessionOrReturn401 } from "@/app/lib/session";
import { NextResponse } from "next/server";
import {
  searchUsersForManagerConversion,
  convertUserToManager,
} from "@/app/services/manager/manager-trainer.service";

// 매니저 변환용 사용자 검색
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

    const users = await searchUsersForManagerConversion(search);
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error searching users for manager conversion:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "사용자 검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
};

// 사용자를 매니저로 변환
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
    const { userId, fitnessCenterIds } = body;

    // 입력 검증
    if (!userId) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    const result = await convertUserToManager(userId, fitnessCenterIds);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error converting user to manager:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "매니저 변환 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
};