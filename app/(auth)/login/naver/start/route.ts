import { redirect } from "next/navigation";

export const GET = () => {
  const naverBaseURL = "https://nid.naver.com/oauth2.0/authorize";
  const naverParams = new URLSearchParams({
    response_type: "code",
    client_id: process.env.NAVER_CLIENT_ID!,
    redirect_uri: process.env.NAVER_REDIRECT_URI!,
    state: process.env.NAVER_STATE!,
  }).toString();
  const naverFinalURL = `${naverBaseURL}?${naverParams}`;
  return redirect(naverFinalURL);
};
