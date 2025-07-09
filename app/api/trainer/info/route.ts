// app/api/trainer/info/route.ts
import { NextResponse } from "next/server";
import { getTrainerUserInfo } from "@/app/lib/services/user-info.service";

export async function GET() {
  try {
    const userInfo = await getTrainerUserInfo();
    return NextResponse.json(userInfo);
  } catch (error) {
    console.error("Trainer info 조회 실패:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("권한이 필요합니다")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message.includes("찾을 수 없습니다")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}