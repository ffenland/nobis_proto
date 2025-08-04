// app/member/chat/connect/page.tsx
"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { ErrorMessage } from "@/app/components/ui/Loading";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default function ChatConnectPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const router = useRouter();
  const params = use(searchParams);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionResult, setConnectionResult] = useState<{
    roomId: string;
    created: boolean;
    trainerName: string;
  } | null>(null);
  const hasConnectedRef = useRef(false);

  const opponentId = params.opp as string | undefined;

  useEffect(() => {
    let mounted = true;

    // 개발 모드 확인 - StrictMode 이슈 회피를 위한 지연
    const isDevelopment = process.env.NODE_ENV === "development";
    const delay = isDevelopment ? 50 : 0; // 개발 모드에서만 50ms 지연

    const timer = setTimeout(() => {
      if (!mounted) return;

      const connectToChat = async () => {
        if (!opponentId) {
          setError("트레이너 ID가 필요합니다.");
          setIsLoading(false);
          return;
        }

        // 이미 연결했으면 중복 요청 방지
        if (hasConnectedRef.current) return;
        hasConnectedRef.current = true;

        try {
          console.log(`[ChatConnect] API 요청 시작 (delay: ${delay}ms)`);

          const response = await fetch("/api/member/chat/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ opponentId }),
          });

          if (!mounted) return;

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || "채팅방 연결 실패");
          }

          setConnectionResult(result);

          // 1초 후 채팅방으로 이동
          setTimeout(() => {
            if (mounted) {
              router.push(`/member/chat/${result.roomId}`);
            }
          }, 1000);
        } catch (err) {
          if (mounted) {
            setError(err instanceof Error ? err.message : "알 수 없는 오류");
            hasConnectedRef.current = false; // 에러 발생 시 재시도 가능하도록
          }
        } finally {
          if (mounted) {
            setIsLoading(false);
          }
        }
      };

      connectToChat();
    }, delay);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [opponentId, router]);

  const handleGoBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              채팅방 연결 중...
            </h2>
            <p className="text-gray-600">
              트레이너와의 채팅방을 준비하고 있습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-red-500 mb-4">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              연결 실패
            </h2>
            <ErrorMessage message={error} />
            <Button onClick={handleGoBack} className="mt-4">
              돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (connectionResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-green-500 mb-4">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {connectionResult.created
                ? "채팅방 생성 완료"
                : "채팅방 연결 완료"}
            </h2>
            <p className="text-gray-600 mb-4">
              {connectionResult.trainerName} 트레이너와의 채팅방으로 이동합니다.
            </p>
            <div className="animate-pulse text-sm text-blue-600">
              잠시만 기다려주세요...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
