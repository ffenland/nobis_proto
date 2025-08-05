import { NextResponse } from "next/server";
import { getSession } from "@/app/lib/session";
import { getTrainersForDirectRegistration } from "@/app/lib/services/manager/direct-registration.service";
import { ErrorReporter } from "@/app/lib/utils/error-reporter";

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session || !session.id || session.role !== "MANAGER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    
    const trainers = await getTrainersForDirectRegistration();
    return NextResponse.json(trainers);
  } catch (error) {
    await ErrorReporter.report(error, {
      action: "get-trainers-for-direct-registration",
      metadata: {
        description: "기존 수업 등록을 위한 트레이너 목록 조회 중 오류",
      },
    });
    
    return NextResponse.json(
      { error: "트레이너 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}