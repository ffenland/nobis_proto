// app/trainer/schedule/off/page.tsx
"use client";

import { useState, useEffect } from "react";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { LoadingSpinner } from "@/app/components/ui/Loading";
import Link from "next/link";
import DayOffSelector from "./components/DayOffSelector";
import OffScheduleList from "./components/OffScheduleList";

interface OffSchedule {
  id: string;
  date: string;
  startTime: number;
  endTime: number;
  createdAt: string;
}

export default function TrainerOffSchedulePage() {
  const [offSchedules, setOffSchedules] = useState<OffSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  // 오프 일정 목록 로드
  const loadOffSchedules = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/trainer/schedule/off");

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "오프 일정을 불러올 수 없습니다.");
      }

      const { data } = await response.json();
      setOffSchedules(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOffSchedules();
  }, []);

  // 성공 메시지 자동 숨김
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // 성공 및 에러 핸들러
  const handleSuccess = () => {
    setSuccessMessage("오프 일정이 성공적으로 등록되었습니다.");
    setShowRegistrationForm(false); // 등록 후 폼 숨기기
    loadOffSchedules(); // 목록 새로고침
  };

  const handleError = (message: string) => {
    setError(message);
  };

  // 오프 일정 삭제
  const handleDelete = async (scheduleId: string) => {
    if (!confirm("이 오프 일정을 삭제하시겠습니까?")) {
      return;
    }

    try {
      const response = await fetch(`/api/trainer/schedule/off/${scheduleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "오프 일정 삭제에 실패했습니다.");
      }

      setSuccessMessage("오프 일정이 삭제되었습니다.");
      await loadOffSchedules(); // 목록 새로고침
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "삭제 중 오류가 발생했습니다."
      );
    }
  };

  if (isLoading) {
    return (
      <PageLayout maxWidth="lg">
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="lg">
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="오프 일정 관리" />
        <Link href="/trainer/schedule">
          <Button variant="outline">스케줄 메뉴로</Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* 성공/에러 메시지 */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <span className="text-green-400 mr-2">✓</span>
              <span className="text-green-700 text-sm">{successMessage}</span>
            </div>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <span className="text-red-400 mr-2">⚠️</span>
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          </div>
        )}
        {/* 새 오프 일정 추가 버튼 */}
        {!showRegistrationForm && (
          <div className="text-center">
            <button
              onClick={() => setShowRegistrationForm(true)}
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-out"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
              <div className="relative flex items-center space-x-3">
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
                  />
                </svg>
                <span>새 오프 일정 등록하기</span>
              </div>
            </button>
          </div>
        )}

        {/* 새 오프 일정 추가 폼 */}
        {showRegistrationForm && (
          <Card className="animate-fadeIn">
            <CardHeader className="flex flex-row items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                오프 일정 등록
              </h2>
              <button
                onClick={() => setShowRegistrationForm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </CardHeader>
            <CardContent>
              <DayOffSelector onSuccess={handleSuccess} onError={handleError} />
            </CardContent>
          </Card>
        )}
        {/* 기존 오프 일정 목록 */}
        <OffScheduleList offSchedules={offSchedules} onDelete={handleDelete} />
        {/* 도움말 */}
        <Card className="bg-blue-50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-blue-900">
                💡 오프 일정 관리 안내
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>
                  • <strong>단일 날짜</strong>: 특정 날짜 하루만 쉬는 경우
                  설정하세요
                </li>
                <li>
                  • <strong>날짜 범위</strong>: 연속된 여러 날 (최대 30일)의
                  휴가나 긴 휴무를 설정할 수 있습니다
                </li>
                <li>
                  • 등록된 오프 일정 시간에는 새로운 PT 예약이 불가능합니다
                </li>
                <li>• 동일한 시간대에 중복된 오프 일정은 등록할 수 없습니다</li>
                <li>
                  • 과거 날짜의 오프 일정은 목록에 표시되지 않습니다
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
