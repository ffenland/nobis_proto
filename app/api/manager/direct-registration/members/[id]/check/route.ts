import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { checkMemberEligibility } from "@/app/lib/services/manager/direct-registration.service";
import { ErrorReporter } from "@/app/lib/utils/error-reporter";

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    const session = await getSession();
    
    if (!session || !session.id || session.role !== "MANAGER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    
    const params = await segmentData.params;
    const { id } = params;
    
    const result = await checkMemberEligibility(id);
    return NextResponse.json(result);
  } catch (error) {
    await ErrorReporter.report(error, {
      action: "check-member-eligibility-for-direct-registration",
      metadata: {
        description: "기존 수업 등록을 위한 회원 자격 확인 중 오류",
      },
    });
    
    return NextResponse.json(
      { error: "회원 자격 확인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}