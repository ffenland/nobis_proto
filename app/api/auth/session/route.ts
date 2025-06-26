// app/api/auth/session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionOrRedirect();

    return NextResponse.json({
      id: session.id,
      role: session.role,
      roleId: session.roleId,
    });
  } catch (error) {
    console.error("세션 조회 실패:", error);
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
}
