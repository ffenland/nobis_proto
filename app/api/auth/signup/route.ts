import { NextRequest, NextResponse } from "next/server";
import { signUp } from "@/app/services/auth/auth.service";
import { createSession } from "@/app/lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 서비스 함수 호출
    const result = await signUp(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    // 회원가입 성공 시 자동 로그인
    await createSession({
      id: result.data!.id,
      role: result.data!.role as "MEMBER" | "TRAINER" | "MANAGER",
      roleId: result.data!.roleId,
    });
    
    return NextResponse.json({
      success: true,
      role: result.data!.role
    });
  } catch (error) {
    console.error("Signup API error:", error);
    return NextResponse.json(
      { error: "회원가입 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}