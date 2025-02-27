import { naverLogin } from "@/app/lib/socialLogin";
import { notFound, redirect } from "next/navigation";
import { NextRequest } from "next/server";

export const GET = async (request: NextRequest) => {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code) {
    return notFound();
  }
  if (state !== process.env.NAVER_STATE!) {
    // 이상한 접근
    return notFound();
  }
  return naverLogin(code);
};
