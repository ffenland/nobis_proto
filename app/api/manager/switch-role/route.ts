import { NextResponse } from "next/server";
import { getSession, getCurrentIronSession } from "@/app/lib/session";
import { getOrCreateTrainerProfileForManager } from "@/app/lib/services/manager/manager-trainer.service";

export async function POST() {
  try {
    const session = await getSession();
    if (!session || session.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 트레이너 프로필 조회 또는 생성
    const trainer = await getOrCreateTrainerProfileForManager(session.id);

    // 세션 업데이트
    const ironSession = await getCurrentIronSession();
    ironSession.role = "TRAINER";
    ironSession.roleId = trainer.id;
    await ironSession.save();

    return NextResponse.json({ 
      success: true,
      redirectUrl: "/trainer"
    });
  } catch (error) {
    console.error("Role switch error:", error);
    return NextResponse.json(
      { error: "역할 전환 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}