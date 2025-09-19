import { NextRequest, NextResponse } from "next/server";
import { getSessionOrReturn401 } from "@/app/lib/session";
import { getManagerCenters } from "@/app/services/manager/dashboard.service";

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  segmentData: { params: Params }
) {
  try {
    // 세션 확인
    const sessionOrResponse = await getSessionOrReturn401();

    if (sessionOrResponse instanceof NextResponse) {
      return sessionOrResponse;
    }

    // 매니저 권한 확인
    if (sessionOrResponse.role !== "MANAGER") {
      return NextResponse.json(
        { error: "매니저 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const params = await segmentData.params;
    const { id: centerId } = params;

    // 매니저가 관리하는 센터 목록 조회
    const managerCenters = await getManagerCenters(sessionOrResponse.roleId);

    // 요청된 센터가 매니저가 관리하는 센터인지 확인
    const center = managerCenters.centers.find((c) => c.id === centerId);

    if (!center) {
      return NextResponse.json(
        { error: "해당 센터에 대한 권한이 없습니다." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: center.id,
      title: center.title,
      address: center.address,
      inOperation: center.inOperation,
    });
  } catch (error) {
    console.error("Get manager center API error:", error);
    return NextResponse.json(
      { error: "센터 정보를 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
