import { NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getTrainerDashboard } from "@/app/services/trainer/dashboard.service";

export async function GET() {
  try {
    const sessionOrResponse = await getSessionOrReturn401();
    
    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }
    
    // 정상 세션인 경우 서비스 함수 호출
    // session.roleId는 Trainer 모델의 id
    const dashboard = await getTrainerDashboard(sessionOrResponse.roleId);
    
    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
