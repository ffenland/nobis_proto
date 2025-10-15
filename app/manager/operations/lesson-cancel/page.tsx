"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";
import { GetCanceledLessonsResult } from "@/app/services/manager/audit.service";

async function approveLessonCancelFetcher(
  url: string,
  { arg }: { arg: { lessonId: string } }
) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "승인 처리 중 오류가 발생했습니다.");
  }

  return response.json();
}

export default function AuditLessonCancelPage() {
  const { data, error, isLoading } = useSWR<GetCanceledLessonsResult>(
    "/api/manager/audit/lesson-cancel"
  );
  const { mutate } = useSWRConfig();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { trigger: approveLesson } = useSWRMutation(
    "/api/manager/audit/lesson-cancel",
    approveLessonCancelFetcher
  );

  const handleApprove = async (lessonId: string) => {
    setProcessingId(lessonId);
    try {
      await approveLesson({ lessonId });
      // 성공 시 데이터 갱신
      await mutate("/api/manager/audit/lesson-cancel");
    } catch (error) {
      console.error("승인 처리 실패:", error);
      alert(
        error instanceof Error
          ? error.message
          : "승인 처리 중 오류가 발생했습니다."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const formatDateTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="flex justify-center items-center py-8">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="alert alert-error">
          <span>데이터를 불러오는 중 오류가 발생했습니다.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            레슨 취소 승인 관리
          </h1>
          <p className="text-gray-600">
            트레이너가 취소한 레슨에 대한 확인 및 승인을 처리합니다.
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="stats shadow bg-white">
            <div className="stat">
              <div className="stat-title">전체 취소 레슨</div>
              <div className="stat-value text-primary">
                {data?.totalCount || 0}
              </div>
            </div>
          </div>

          <div className="stats shadow bg-white">
            <div className="stat">
              <div className="stat-title">확인 대기중</div>
              <div className="stat-value text-warning">
                {data?.pendingCount || 0}
              </div>
            </div>
          </div>

          <div className="stats shadow bg-white">
            <div className="stat">
              <div className="stat-title">확인 완료</div>
              <div className="stat-value text-success">
                {data?.checkedCount || 0}
              </div>
            </div>
          </div>
        </div>

        {/* 확인 대기중 레슨 */}
        {data?.pendingLessons && data.pendingLessons.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              확인 대기중 ({data.pendingCount}개)
            </h2>
            <div className="space-y-4">
              {data.pendingLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="bg-white rounded-lg shadow p-6 border-l-4 border-warning"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <h3 className="font-semibold text-lg">
                          {lesson.trainerName} 트레이너
                        </h3>
                        <span className="badge badge-warning">확인 대기중</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">
                            예정 수업 시간
                          </p>
                          <p className="font-medium">
                            {formatDateTime(lesson.scheduledAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">
                            취소 신청 시간
                          </p>
                          <p className="font-medium">
                            {formatDateTime(lesson.createdAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">피트니스 센터</p>
                          <p className="font-medium">
                            {lesson.fitnessCenterTitle}
                          </p>
                        </div>
                        {lesson.memo && (
                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-600">메모</p>
                            <p className="font-medium bg-gray-50 p-2 rounded">
                              {lesson.memo}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-4">
                      <button
                        onClick={() => handleApprove(lesson.id)}
                        disabled={processingId === lesson.id}
                        className="btn btn-success"
                      >
                        {processingId === lesson.id ? (
                          <>
                            <span className="loading loading-spinner loading-sm"></span>
                            처리중...
                          </>
                        ) : (
                          "승인"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 확인 완료 레슨 */}
        {data?.checkedLessons && data.checkedLessons.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              확인 완료 ({data.checkedCount}개)
            </h2>
            <div className="space-y-4">
              {data.checkedLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="bg-white rounded-lg shadow p-6 border-l-4 border-success"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <h3 className="font-semibold text-lg">
                          {lesson.trainerName} 트레이너
                        </h3>
                        <span className="badge badge-success">확인 완료</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">
                            예정 수업 시간
                          </p>
                          <p className="font-medium">
                            {formatDateTime(lesson.scheduledAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">
                            취소 신청 시간
                          </p>
                          <p className="font-medium">
                            {formatDateTime(lesson.createdAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">승인 시간</p>
                          <p className="font-medium">
                            {lesson.managerCheckedAt
                              ? formatDateTime(lesson.managerCheckedAt)
                              : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">승인한 매니저</p>
                          <p className="font-medium">
                            {lesson.managerName || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">피트니스 센터</p>
                          <p className="font-medium">
                            {lesson.fitnessCenterTitle}
                          </p>
                        </div>
                        {lesson.memo && (
                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-600">메모</p>
                            <p className="font-medium bg-gray-50 p-2 rounded">
                              {lesson.memo}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 데이터가 없는 경우 */}
        {(!data?.totalCount || data.totalCount === 0) && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">취소된 레슨이 없습니다.</div>
          </div>
        )}
      </div>
    </div>
  );
}
