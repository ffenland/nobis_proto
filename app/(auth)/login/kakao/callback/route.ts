import { kakaoLogin } from "@/app/lib/socialLogin";
import { notFound } from "next/navigation";
import { NextRequest } from "next/server";

export const GET = async (request: NextRequest) => {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get("error_description");
  
  if (error) {
    // 사용자가 로그인 취소 또는 오류 발생
    console.error("Kakao login error:", error, errorDescription);
    return notFound();
  }
  
  if (!code) {
    return notFound();
  }
  
  return kakaoLogin(code);
};