import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import {
  getCanceledLessons,
  approveLessonCancel,
  ApproveLessonCancelInput,
} from "@/app/services/manager/audit.service";

export async function GET() {
  try {
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    // 매니저 권한 확인
    if (sessionOrResponse.role !== "MANAGER") {
      return NextResponse.json(
        { error: "매니저 권한이 필요합니다." },
        { status: 403 }
      );
    }

    // 취소된 레슨 조회
    const result = await getCanceledLessons(sessionOrResponse.roleId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get canceled lessons API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    // 매니저 권한 확인
    if (sessionOrResponse.role !== "MANAGER") {
      return NextResponse.json(
        { error: "매니저 권한이 필요합니다." },
        { status: 403 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { lessonId }: ApproveLessonCancelInput = body;

    // 입력 데이터 검증
    if (!lessonId || typeof lessonId !== "string") {
      return NextResponse.json(
        { error: "lessonId가 필요합니다." },
        { status: 400 }
      );
    }

    // 레슨 취소 승인 처리
    const result = await approveLessonCancel(sessionOrResponse.roleId, {
      lessonId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Approve lesson cancel API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}