"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { mutate } from "swr";
import { LoadingSpinner } from "@/app/components/ui/Loading";
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function KakaoCallback(props: { searchParams: SearchParams }) {
  const router = useRouter();
  const searchParams = use(props.searchParams);
  const [status, setStatus] = useState("카카오 로그인 처리 중...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleLogin() {
      const code = searchParams.code;
      const errorParam = searchParams.error;

      // 카카오에서 에러 반환한 경우
      if (errorParam) {
        console.error("Kakao OAuth error:", errorParam);
        router.push("/login?error=failkakao");
        return;
      }

      // code가 없는 경우
      if (!code) {
        router.push("/login?error=nocode");
        return;
      }

      try {
        setStatus("카카오 인증 확인 중...");

        // 1. 로그인 처리 API 호출
        const response = await fetch("/api/auth/kakao/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus("로그인 완료! 페이지를 이동합니다...");

          // 2. SWR 캐시 갱신 - GlobalHeader가 즉시 표시되도록
          await mutate("/api/auth/session");

          // 3. role에 맞는 페이지로 이동
          const redirectPath = data.role?.toLowerCase() || "member";
          router.push(`/${redirectPath}`);
        } else {
          // 에러 처리
          const errorType = data.error || "unknown";
          setError(`로그인 처리 중 오류가 발생했습니다. (${errorType})`);

          // 3초 후 로그인 페이지로 리다이렉트
          setTimeout(() => {
            router.push(`/login?error=${errorType}`);
          }, 3000);
        }
      } catch (error) {
        console.error("Login process error:", error);
        setError("네트워크 오류가 발생했습니다.");

        setTimeout(() => {
          router.push("/login?error=network");
        }, 3000);
      }
    }

    handleLogin();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <div className="text-center">
        {/* 로딩 스피너 */}
        {!error && (
          <div className="mb-8">
            <LoadingSpinner size="lg" className="mx-auto" />
          </div>
        )}

        {/* 로고 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Nobis Gym</h1>
        </div>

        {/* 상태 메시지 */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-red-600">{error}</p>
            <p className="text-sm text-red-500 mt-2">
              잠시 후 로그인 페이지로 이동합니다...
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
            <p className="text-gray-700 text-lg">{status}</p>
            <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요...</p>
          </div>
        )}
      </div>
    </div>
  );
}
