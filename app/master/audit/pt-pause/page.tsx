"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Loading";
import { Button } from "@/app/components/ui/Button";
import { Info } from "lucide-react";
import { formatDateWithoutWeekday } from "@/app/lib/utils/time.utils";
import type { GetPtPausesResult } from "@/app/services/master/audit.service";
import type { SessionResponse } from "@/app/services/auth/auth.service";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const PtPauseCheck = () => {
  const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending");

  const {
    data: ptPausesData,
    error,
    mutate,
    isLoading,
  } = useSWR<GetPtPausesResult>("/api/master/audit/pt-pause", fetcher);

  // 세션 정보 가져오기
  const { data: session } = useSWR<SessionResponse>(
    "/api/auth/session",
    fetcher
  );

  // 승인 처리
  const handleApprove = async (ptPauseId: string) => {
    if (!confirm("이 일시정지 요청을 승인하시겠습니까?")) {
      return;
    }

    try {
      const response = await fetch("/api/master/audit/pt-pause", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ptPauseId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "승인 처리에 실패했습니다.");
      }

      alert("일시정지가 승인되었습니다.");
      await mutate(); // 데이터 재조회
    } catch (error) {
      console.error("Approve error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "승인 처리 중 오류가 발생했습니다."
      );
    }
  };

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

  if (error || !ptPausesData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent>
            <div className="text-center text-red-500 py-8">
              <p>PT 일시정지 목록을 불러올 수 없습니다.</p>
              <Button onClick={() => mutate()} className="mt-4">
                다시 시도
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { pendingPauses, approvedPauses, pendingCount, approvedCount } =
    ptPausesData;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          PT 일시정지 확인 관리
        </h1>
        <p className="text-gray-600 mb-3">
          트레이너의 PT 일시정지 요청을 확인합니다
        </p>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• PT 일시정지 요청들을 확인할 수 있습니다</li>
          <li>• 승인 처리를 하면 해당 기간만큼 PT 만료일이 연장됩니다</li>
          <li>• 최근 2개월 이내의 요청만 표시됩니다</li>
        </ul>
      </div>

      {/* 탭 */}
      <div className="tabs tabs-boxed bg-base-200 mb-6">
        <button
          className={`tab ${activeTab === "pending" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          확인 대기 <Badge variant="warning">{pendingCount}</Badge>
        </button>
        <button
          className={`tab ${activeTab === "approved" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("approved")}
        >
          확인 완료 <Badge variant="success">{approvedCount}</Badge>
        </button>
      </div>

      {/* 확인 대기 탭 */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          {pendingCount === 0 ? (
            <Card>
              <CardContent>
                <div className="text-center py-12">
                  <Info className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">
                    확인 대기중인 요청이 없습니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            pendingPauses.map((pause) => (
              <Card
                key={pause.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardContent>
                  <div className="space-y-4">
                    {/* 헤더 영역 */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 my-2">
                          <Badge variant="warning">확인 대기</Badge>
                          <span className="text-sm text-gray-500">
                            {pause.centerTitle}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {pause.trainerName} 트레이너 - {pause.memberName} 회원
                        </h3>
                      </div>
                    </div>

                    {/* PT 정보 */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="flex justify-between items-center md:justify-start md:gap-4">
                          <span className="text-sm text-gray-600">
                            PT 시작일
                          </span>
                          <span className="font-medium">
                            {formatDateWithoutWeekday(pause.ptStartDate)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center md:justify-start md:gap-4">
                          <span className="text-sm text-gray-600">
                            완료된 레슨
                          </span>
                          <span className="font-medium">
                            {pause.completedLessonsCount}회
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 일시정지 정보 */}
                    <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                      <h4 className="font-semibold text-blue-900 mb-3">
                        일시정지 요청 정보
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">요청일</span>
                          <span className="font-medium">
                            {formatDateWithoutWeekday(pause.createdAt)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            일시정지 시작일
                          </span>
                          <span className="font-medium">
                            {formatDateWithoutWeekday(pause.startDate)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            일시정지 종료일
                          </span>
                          <span className="font-medium">
                            {formatDateWithoutWeekday(pause.endDate)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            일시정지 기간
                          </span>
                          <span className="font-bold text-lg text-blue-700">
                            {pause.days}일
                          </span>
                        </div>
                      </div>
                      <div className="divider my-2"></div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">사유</p>
                        <p className="text-sm bg-white p-3 rounded border border-blue-200">
                          {pause.reason}
                        </p>
                      </div>
                    </div>

                    {/* 승인 버튼 - Master만 */}
                    {session?.role === "MASTER" && (
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          onClick={() => handleApprove(pause.id)}
                          variant="primary"
                          size="lg"
                        >
                          확인 처리
                        </Button>
                      </div>
                    )}
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
          {approvedCount === 0 ? (
            <Card>
              <CardContent>
                <div className="text-center py-12">
                  <Info className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">확인 완료된 요청이 없습니다.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            approvedPauses.map((pause) => (
              <Card
                key={pause.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardContent>
                  <div className="space-y-4">
                    {/* 헤더 영역 */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 my-2">
                          <Badge variant="success">확인 완료</Badge>
                          <span className="text-sm text-gray-500">
                            {pause.centerTitle}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {pause.trainerName} 트레이너 - {pause.memberName} 회원
                        </h3>
                      </div>
                    </div>

                    {/* PT 정보 */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="flex justify-between items-center md:justify-start md:gap-4">
                          <span className="text-sm text-gray-600">
                            PT 시작일
                          </span>
                          <span className="font-medium">
                            {formatDateWithoutWeekday(pause.ptStartDate)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center md:justify-start md:gap-4">
                          <span className="text-sm text-gray-600">
                            완료된 레슨
                          </span>
                          <span className="font-medium">
                            {pause.completedLessonsCount}회
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 일시정지 정보 */}
                    <div className="bg-green-50 p-4 rounded-lg space-y-2">
                      <h4 className="font-semibold text-green-900 mb-3">
                        일시정지 정보
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">요청일</span>
                          <span className="font-medium">
                            {formatDateWithoutWeekday(pause.createdAt)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            일시정지 시작일
                          </span>
                          <span className="font-medium">
                            {formatDateWithoutWeekday(pause.startDate)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            일시정지 종료일
                          </span>
                          <span className="font-medium">
                            {formatDateWithoutWeekday(pause.endDate)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            일시정지 기간
                          </span>
                          <span className="font-bold text-lg text-green-700">
                            {pause.days}일
                          </span>
                        </div>
                        <div className="divider my-2"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            확인 처리일
                          </span>
                          <span className="font-medium text-green-700">
                            {pause.approvedAt
                              ? formatDateWithoutWeekday(pause.approvedAt)
                              : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">
                            확인 처리자
                          </span>
                          <span className="font-medium text-green-700">
                            {pause.approverName}
                          </span>
                        </div>
                      </div>
                      <div className="divider my-2"></div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">사유</p>
                        <p className="text-sm bg-white p-3 rounded border border-green-200">
                          {pause.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PtPauseCheck;
