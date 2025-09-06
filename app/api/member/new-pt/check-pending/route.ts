import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { checkPendingPt } from "@/app/services/member/pt/pt.service";

export async function GET() {
  try {
    // 세션 확인
    const session = await getSession();
    if (!session || session.role !== "MEMBER") {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    // PENDING PT 체크
    const result = await checkPendingPt(session.roleId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("PENDING PT 체크 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}