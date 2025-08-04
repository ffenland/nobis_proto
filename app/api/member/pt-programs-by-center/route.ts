// app/api/member/pt-programs-by-center/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getPtProgramsByCenterService } from "@/app/lib/services/pt-apply.service";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "MEMBER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const centerId = searchParams.get("centerId");

    if (!centerId) {
      return NextResponse.json(
        { error: "센터 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const ptPrograms = await getPtProgramsByCenterService(centerId);
    return NextResponse.json(ptPrograms);
  } catch (error) {
    console.error("PT Programs by Center 조회 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
