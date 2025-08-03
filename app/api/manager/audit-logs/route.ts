import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getAuditLogs } from "@/app/lib/services/audit/pt-record-audit.service";
import { AuditAction } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url);
    
    const trainerId = searchParams.get("trainerId") || undefined;
    const startDate = searchParams.get("startDate") 
      ? new Date(searchParams.get("startDate")!) 
      : undefined;
    const endDate = searchParams.get("endDate") 
      ? new Date(searchParams.get("endDate")!) 
      : undefined;
    const onlyOutOfTime = searchParams.get("onlyOutOfTime") === "true";
    const action = searchParams.get("action") as AuditAction | undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // 감사 로그 조회
    const result = await getAuditLogs({
      trainerId,
      startDate,
      endDate,
      onlyOutOfTime,
      action,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("감사 로그 조회 실패:", error);
    return NextResponse.json(
      { error: "감사 로그 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}