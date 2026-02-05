"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Loading";
import { Button } from "@/app/components/ui/Button";
import { Info } from "lucide-react";
import {
  getCancelRequestTiming,
  formatDateWithoutWeekday,
  getTimeFromDateTime,
  formatTime,
} from "@/app/lib/utils/time.utils";
import type { GetCanceledLessonsResult } from "@/app/services/master/audit.service";

// ===== Fetcher =====

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// ===== 메인 컴포넌트 =====

export default function LessonCancelPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending");
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // 데이터 페칭
  const { data, error, isLoading, mutate } = useSWR<GetCanceledLessonsResult>(
    "/api/master/audit/lesson-cancel",
    fetcher
  );

  // 5일 경과 체크
  const isOverdue = (canceledAt: Date): boolean => {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    return new Date(canceledAt) < fiveDaysAgo;
  };

  // 확인 처리
  const handleApprove = async (lessonId: string, trainerName: string) => {
    if (
      !confirm(
        `${trainerName} 트레이너의 레슨 취소를 확인하시겠습니까?\n확인 후에는 알림창에 표시되지 않습니다.`
      )
    ) {
      return;
    }

    setApprovingId(lessonId);

    try {
      const response = await fetch("/api/master/audit/lesson-cancel", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lessonId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "확인 처리 중 오류가 발생했습니다.");
      }

      alert("확인이 완료되었습니다.");
      mutate(); // 데이터 재조회
    } catch (error) {
      console.error("Approve error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "확인 처리 중 오류가 발생했습니다."
      );
    } finally {
      setApprovingId(null);
    }
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent>
            <div className="text-center text-red-500 py-8">
              <p>레슨 취소 목록을 불러올 수 없습니다.</p>
              <Button onClick={() => mutate()} className="mt-4">
                다시 시도
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          레슨 취소 확인 관리
        </h1>
        <p className="text-gray-600 mb-3">
          트레이너와 회원의 레슨 취소 요청을 확인합니다
        </p>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 취소된 레슨들을 확인할 수 있습니다</li>
          <li>
            • 내용을 확인하시고 확인처리를 하시면 더이상 알림창에 표시되지
            않습니다
          </li>
          <li>
            • 이미 취소요청된 레슨은 복귀가 불가능하며 새로 레슨일정을
            잡아야합니다
          </li>
          <li>• 최근 2개월 이내의 취소건만 표시됩니다</li>
        </ul>
      </div>

      {/* 탭 */}
      <div className="tabs tabs-boxed bg-base-200 mb-6">
        <button
          className={`tab ${activeTab === "pending" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          확인 대기 <Badge variant="warning">{data.pendingCount}</Badge>
        </button>
        <button
          className={`tab ${activeTab === "approved" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("approved")}
        >
          확인 완료 <Badge variant="success">{data.approvedCount}</Badge>
        </button>
      </div>

      {/* 확인 대기 탭 */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          {data.pendingCount === 0 ? (
            <Card>
              <CardContent>
                <div className="text-center py-12">
                  <Info className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">확인 대기중인 요청이 없습니다.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            data.pendingLessons.map((lesson) => (
              <Card
                key={lesson.id}
                className="border-orange-200 bg-orange-50/30"
              >
                <CardContent className="p-6">
                  {/* 배지 라인 */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge
                      variant="default"
                      className="text-xs bg-orange-100 text-orange-800"
                    >
                      취소
                    </Badge>

                    {/* 5일 경과 체크 */}
                    {lesson.cancelInfo &&
                      isOverdue(new Date(lesson.cancelInfo.canceledAt)) && (
                        <Badge
                          variant="default"
                          className="text-xs bg-red-100 text-red-800 font-bold animate-pulse"
                        >
                          ⚠️ 5일 경과
                        </Badge>
                      )}

                    {/* 취소 요청자 */}
                    {lesson.cancelInfo && (
                      <>
                        {lesson.cancelInfo.canceledBy === "TRAINER" && (
                          <Badge
                            variant="default"
                            className="text-xs bg-blue-100 text-blue-800"
                          >
                            트레이너 요청
                          </Badge>
                        )}
                        {lesson.cancelInfo.canceledBy === "MEMBER" && (
                          <Badge
                            variant="default"
                            className="text-xs bg-green-100 text-green-800"
                          >
                            회원 요청
                          </Badge>
                        )}
                        {lesson.cancelInfo.canceledBy === "MANAGER" && (
                          <Badge
                            variant="default"
                            className="text-xs bg-purple-100 text-purple-800"
                          >
                            매니저 요청
                          </Badge>
                        )}
                      </>
                    )}
                  </div>

                  {/* 센터 및 인물 정보 */}
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700 mb-3">
                    <span className="font-semibold">{lesson.centerTitle}</span>
                    <span className="text-gray-400">|</span>
                    <span>트레이너: {lesson.trainerName}</span>
                    <span className="text-gray-400">|</span>
                    <span>회원: {lesson.memberName}</span>
                  </div>

                  {/* 날짜 및 시간 */}
                  <div className="text-sm text-gray-600 mb-3">
                    <span>{formatDateWithoutWeekday(lesson.scheduledAt)}</span>
                    <span className="mx-2">
                      {formatTime(getTimeFromDateTime(lesson.scheduledAt))} -{" "}
                      {formatTime(getTimeFromDateTime(lesson.endAt))}
                    </span>
                  </div>

                  {/* 취소 요청일 및 시점 */}
                  {lesson.cancelInfo && (
                    <div className="text-sm text-gray-600 mb-3">
                      <span className="font-medium">취소요청일:</span>{" "}
                      {formatDateWithoutWeekday(lesson.cancelInfo.createdAt)}{" "}
                      <span
                        className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                          getCancelRequestTiming(
                            lesson.scheduledAt,
                            lesson.cancelInfo.createdAt
                          ) === "레슨 시작 후"
                            ? "bg-red-100 text-red-700"
                            : getCancelRequestTiming(
                                lesson.scheduledAt,
                                lesson.cancelInfo.createdAt
                              ) === "레슨 임박"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {getCancelRequestTiming(
                          lesson.scheduledAt,
                          lesson.cancelInfo.createdAt
                        )}
                      </span>
                    </div>
                  )}

                  {/* 취소 사유 */}
                  {lesson.cancelInfo && (
                    <div className="mb-4">
                      <div className="text-xs text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
                        <span className="font-medium">사유:</span>{" "}
                        {lesson.cancelInfo.reason}
                      </div>
                    </div>
                  )}

                  {/* 확인 버튼 */}
                  <div className="flex justify-end">
                    <Button
                      variant="default"
                      onClick={() =>
                        handleApprove(lesson.id, lesson.trainerName)
                      }
                      disabled={approvingId === lesson.id}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {approvingId === lesson.id ? "처리 중..." : "확인하기"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* 확인 완료 탭 */}
      {activeTab === "approved" && (
        <div className="space-y-4">
          {data.approvedCount === 0 ? (
            <Card>
              <CardContent>
                <div className="text-center py-12">
                  <Info className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">확인 완료된 요청이 없습니다.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            data.approvedLessons.map((lesson) => (
              <Card key={lesson.id} className="border-gray-200 bg-white">
                <CardContent className="p-6">
                  {/* 배지 라인 */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge
                      variant="default"
                      className="text-xs bg-orange-100 text-orange-800"
                    >
                      취소
                    </Badge>

                    <Badge
                      variant="success"
                      className="text-xs bg-green-100 text-green-800"
                    >
                      확인완료
                    </Badge>

                    {/* 취소 요청자 */}
                    {lesson.cancelInfo && (
                      <>
                        {lesson.cancelInfo.canceledBy === "TRAINER" && (
                          <Badge
                            variant="default"
                            className="text-xs bg-blue-100 text-blue-800"
                          >
                            트레이너 요청
                          </Badge>
                        )}
                        {lesson.cancelInfo.canceledBy === "MEMBER" && (
                          <Badge
                            variant="default"
                            className="text-xs bg-green-100 text-green-800"
                          >
                            회원 요청
                          </Badge>
                        )}
                        {lesson.cancelInfo.canceledBy === "MANAGER" && (
                          <Badge
                            variant="default"
                            className="text-xs bg-purple-100 text-purple-800"
                          >
                            매니저 요청
                          </Badge>
                        )}
                      </>
                    )}
                  </div>

                  {/* 센터 및 인물 정보 */}
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700 mb-3">
                    <span className="font-semibold">{lesson.centerTitle}</span>
                    <span className="text-gray-400">|</span>
                    <span>트레이너: {lesson.trainerName}</span>
                    <span className="text-gray-400">|</span>
                    <span>회원: {lesson.memberName}</span>
                  </div>

                  {/* 날짜 및 시간 */}
                  <div className="text-sm text-gray-600 mb-3">
                    <span>{formatDateWithoutWeekday(lesson.scheduledAt)}</span>
                    <span className="mx-2">
                      {formatTime(getTimeFromDateTime(lesson.scheduledAt))} -{" "}
                      {formatTime(getTimeFromDateTime(lesson.endAt))}
                    </span>
                  </div>

                  {/* 취소 요청일 및 시점 */}
                  {lesson.cancelInfo && (
                    <div className="text-sm text-gray-600 mb-3">
                      <span className="font-medium">취소요청일:</span>{" "}
                      {formatDateWithoutWeekday(lesson.cancelInfo.createdAt)}{" "}
                      <span
                        className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                          getCancelRequestTiming(
                            lesson.scheduledAt,
                            lesson.cancelInfo.createdAt
                          ) === "레슨 시작 후"
                            ? "bg-red-100 text-red-700"
                            : getCancelRequestTiming(
                                lesson.scheduledAt,
                                lesson.cancelInfo.createdAt
                              ) === "레슨 임박"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {getCancelRequestTiming(
                          lesson.scheduledAt,
                          lesson.cancelInfo.createdAt
                        )}
                      </span>
                    </div>
                  )}

                  {/* 확인 정보 */}
                  {lesson.cancelInfo?.approvedAt && (
                    <div className="text-xs text-gray-600 mb-3">
                      확인: {lesson.cancelInfo.approverName} (
                      {formatDateWithoutWeekday(lesson.cancelInfo.approvedAt)})
                    </div>
                  )}

                  {/* 취소 사유 */}
                  {lesson.cancelInfo && (
                    <div className="text-xs text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
                      <span className="font-medium">사유:</span>{" "}
                      {lesson.cancelInfo.reason}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
