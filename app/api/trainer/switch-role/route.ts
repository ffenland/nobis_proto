import { NextResponse } from "next/server";
import { getSession, getCurrentIronSession } from "@/app/lib/session";
import { getManagerProfileForTrainer } from "@/app/lib/services/manager/manager-trainer.service";

export async function POST() {
  try {
    const session = await getSession();
    if (!session || session.role !== "TRAINER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 매니저 프로필 조회
    const manager = await getManagerProfileForTrainer(session.id);
    
    if (!manager) {
      return NextResponse.json(
        { error: "매니저 권한이 없습니다." },
        { status: 403 }
      );
    }

    // 세션 업데이트
    const ironSession = await getCurrentIronSession();
    ironSession.role = "MANAGER";
    ironSession.roleId = manager.id;
    await ironSession.save();

    return NextResponse.json({ 
      success: true,
      redirectUrl: "/manager"
    });
  } catch (error) {
    console.error("Role switch error:", error);
    return NextResponse.json(
      { error: "역할 전환 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}