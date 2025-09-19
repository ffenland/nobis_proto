import { NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getFitnessCenters } from "@/app/lib/services/fitness-center.service";

// GET: 운영 중인 피트니스 센터 목록 조회 (모든 role 접근 가능)
export async function GET() {
  try {
    const sessionOrResponse = await getSessionOrReturn401();

    // 401 응답인 경우 바로 반환
    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    // 모든 role이 접근 가능하므로 추가 권한 확인 없음
    const centers = await getFitnessCenters();
    return NextResponse.json(centers);
  } catch (error) {
    console.error("센터 목록 조회 오류:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "센터 목록을 조회할 수 없습니다." },
      { status: 500 }
    );
  }
}
