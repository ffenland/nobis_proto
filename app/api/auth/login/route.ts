import { NextRequest, NextResponse } from "next/server";
import { passwordLogin } from "@/app/services/auth/auth.service";
import { createSession } from "@/app/lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    //
    const result = await passwordLogin(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    //
    await createSession({
      id: result.data!.id,
      role: result.data!.role as "MEMBER" | "TRAINER" | "MANAGER",
      roleId: result.data!.roleId,
    });

    return NextResponse.json({
      success: true,
      role: result.data!.role,
    });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: "로그인에러" }, { status: 500 });
  }
}
