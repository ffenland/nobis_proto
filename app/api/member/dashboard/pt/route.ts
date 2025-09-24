import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getPt } from "@/app/services/member/dashboard.service";

export async function GET(request: NextRequest) {
  try {
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    // MEMBER만 접근 가능
    if (sessionOrResponse.role !== "MEMBER") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const pt = await getPt(sessionOrResponse.roleId);

    return NextResponse.json(pt);
  } catch (error) {
    console.error("Dashboard PT API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}