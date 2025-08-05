import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { searchMembersForDirectRegistration } from "@/app/lib/services/manager/direct-registration.service";
import { ErrorReporter } from "@/app/lib/utils/error-reporter";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !session.id || session.role !== "MANAGER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get("q") || "";
    
    const members = await searchMembersForDirectRegistration(keyword);
    return NextResponse.json(members);
  } catch (error) {
    await ErrorReporter.report(error, {
      action: "search-members-for-direct-registration",
      metadata: {
        description: "기존 수업 등록을 위한 회원 검색 중 오류",
      },
    });
    
    return NextResponse.json(
      { error: "회원 검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}