// app/trainer/chat/connect/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { ErrorMessage } from "@/app/components/ui/Loading";

export default function TrainerChatConnectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionResult, setConnectionResult] = useState<{
    roomId: string;
    created: boolean;
    memberName: string;
  } | null>(null);
  const hasConnectedRef = useRef(false);

  const opponentId = searchParams.get("opp");

  useEffect(() => {
    let mounted = true;
    
    // 개발 모드 확인 - StrictMode 이슈 회피를 위한 지연
    const isDevelopment = process.env.NODE_ENV === 'development';
    const delay = isDevelopment ? 50 : 0; // 개발 모드에서만 50ms 지연

    const timer = setTimeout(() => {
      if (!mounted) return;
      
      const connectToChat = async () => {
        if (!opponentId) {
          setError("회원 ID가 필요합니다.");
          setIsLoading(false);
          return;
        }

        // 이미 연결했으면 중복 요청 방지
        if (hasConnectedRef.current) return;
        hasConnectedRef.current = true;

        try {
          console.log(`[TrainerChatConnect] API 요청 시작 (delay: ${delay}ms)`);
          
          const response = await fetch("/api/trainer/chat/connect", {
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
              router.push(`/trainer/chat/${result.roomId}`);
            }
          }, 1000);
        } catch (err) {
          if (mounted) {
            setError(err instanceof Error ? err.message : "채팅 연결 중 오류 발생");
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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <ErrorMessage
              message={error}
              action={
                <Button variant="outline" onClick={() => router.back()}>
                  돌아가기
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              <p className="text-gray-600">채팅방 연결 중...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (connectionResult) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <div className="text-green-600">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold">
                {connectionResult.created ? "채팅방이 생성되었습니다" : "채팅방에 연결되었습니다"}
              </h2>
              <p className="text-gray-600">
                {connectionResult.memberName}님과의 채팅으로 이동합니다...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}