// app/api/member/pending-pt-check/route.ts
import { NextResponse } from "next/server";
import { getSessionOrRedirect } from "@/app/lib/session";
import { getPendingPtDetails } from "@/app/lib/services/pt-apply.service";

export async function GET() {
  try {
    const session = await getSessionOrRedirect();
    if (session.role !== "MEMBER") {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const pendingPtDetails = await getPendingPtDetails(session.roleId);

    if (pendingPtDetails) {
      return NextResponse.json({
        hasPending: true,
        pendingPt: {
          id: pendingPtDetails.id,
          ptTitle: pendingPtDetails.ptProduct.title,
          trainerName:
            pendingPtDetails.trainer?.user.username || "트레이너 미배정",
          appliedDate: pendingPtDetails.createdAt.toISOString(),
          price: pendingPtDetails.ptProduct.price,
          totalCount: pendingPtDetails.ptProduct.totalCount,
        },
      });
    } else {
      return NextResponse.json({
        hasPending: false,
        pendingPt: null,
      });
    }
  } catch (error) {
    console.error("PENDING PT 체크 실패:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
