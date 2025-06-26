"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScheduleCalendar } from "@/app/components/schedule/ScheduleCalendar";

export default function TrainerSchedulePage() {
  const router = useRouter();
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 세션에서 트레이너 ID 가져오기
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        if (!response.ok) {
          throw new Error("세션 조회 실패");
        }

        const session = await response.json();
        if (session.role !== "TRAINER") {
          router.push("/");
          return;
        }

        setTrainerId(session.roleId);
      } catch (error) {
        console.error("세션 조회 오류:", error);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [router]);

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 트레이너 ID가 없는 경우
  if (!trainerId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">트레이너 정보를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">주간 스케줄</h1>
          <p className="text-gray-600">PT 수업과 휴무 일정을 확인하세요</p>
        </div>

        <ScheduleCalendar trainerId={trainerId} forManager={false} />
      </div>
    </div>
  );
}
