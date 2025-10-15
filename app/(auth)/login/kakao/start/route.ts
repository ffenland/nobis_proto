import { NextRequest } from "next/server";
import { redirect } from "next/navigation";

export const GET = (request: NextRequest) => {
  const kakaoBaseURL = "https://kauth.kakao.com/oauth/authorize";
  const kakaoParams = new URLSearchParams({
    response_type: "code",
    client_id: process.env.KAKAO_REST_API_KEY!,
    redirect_uri: process.env.KAKAO_REDIRECT_URI!,
  }).toString();
  const kakaoFinalURL = `${kakaoBaseURL}?${kakaoParams}`;
  return redirect(kakaoFinalURL);
};