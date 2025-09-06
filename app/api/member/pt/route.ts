// app/api/member/pt/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getMemberActivePt } from "@/app/services/member/pt/pt.service";

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

    // 활성 PT 조회
    const activePt = await getMemberActivePt(session.roleId);

    return NextResponse.json(activePt);
  } catch (error) {
    console.error("활성 PT 조회 실패:", error);
    return NextResponse.json(
      { error: "PT 정보를 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}