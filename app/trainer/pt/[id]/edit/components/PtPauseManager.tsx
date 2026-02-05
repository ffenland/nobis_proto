"use client";

import { useState } from "react";
import useSWR from "swr";
import { GetPtPauseInfoResult } from "@/app/services/trainer/pt.service";
import { DayPicker, DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";

interface PtPauseManagerProps {
  ptId: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PtPauseManager({ ptId }: PtPauseManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: pauseInfo,
    error,
    isLoading,
    mutate,
  } = useSWR<GetPtPauseInfoResult>(
    `/api/trainer/pt/${ptId}/pause`,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4 w-32"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !pauseInfo) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <div className="text-red-500">
            일시정지 정보를 불러올 수 없습니다.
          </div>
        </div>
      </div>
    );
  }

  // 모든 일시정지 기간의 날짜들을 배열로 생성 (승인된 + 대기중인)
  const getDisabledDates = () => {
    const allPauses = [
      ...pauseInfo.approvedPauses,
      ...pauseInfo.pendingPauses,
    ];

    const disabledDates: Date[] = [];

    allPauses.forEach((pause) => {
      const start = new Date(pause.startDate);
      const end = new Date(pause.endDate);

      // 시작일부터 종료일까지의 모든 날짜를 추가
      const currentDate = new Date(start);
      while (currentDate <= end) {
        disabledDates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    return disabledDates;
  };

  // 날짜 겹침 검증 함수 (모든 일시정지 기간 체크)
  const checkDateOverlap = (
    newStart: Date,
    newEnd: Date,
    existingPauses: Array<{ startDate: string; endDate: string }>
  ): boolean => {
    return existingPauses.some((pause) => {
      const existingStart = new Date(pause.startDate);
      const existingEnd = new Date(pause.endDate);

      return (
        (newStart >= existingStart && newStart <= existingEnd) ||
        (newEnd >= existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      );
    });
  };

  // 제출 핸들러
  const handleSubmit = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      alert("날짜를 선택해주세요");
      return;
    }

    if (!reason.trim()) {
      alert("사유를 입력해주세요");
      return;
    }

    // 날짜 겹침 검증 (모든 일시정지 기간 체크)
    const allPauses = [
      ...pauseInfo.approvedPauses,
      ...pauseInfo.pendingPauses,
    ];

    if (checkDateOverlap(dateRange.from, dateRange.to, allPauses)) {
      alert(
        "선택한 날짜가 기존 일시정지 기간과 겹칩니다. 다른 날짜를 선택해주세요."
      );
      return;
    }

    if (!confirm("일시정지 요청을 등록하시겠습니까? (매니저 승인 필요)")) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/trainer/pt/${ptId}/pause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
          reason: reason.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create pause");
      }

      alert("일시정지 요청이 등록되었습니다. 매니저 승인 후 적용됩니다.");
      await mutate();
      setIsAdding(false);
      setDateRange(undefined);
      setReason("");
    } catch (error) {
      console.error("Error creating pause:", error);
      alert(
        error instanceof Error
          ? error.message
          : "일시정지 등록 중 오류가 발생했습니다"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* PT 정보 카드 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h3 className="card-title">일시정지 관리</h3>

          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">원래 만료일</span>
              <span className="font-medium">
                {pauseInfo.expirationDate
                  ? new Date(pauseInfo.expirationDate).toLocaleDateString()
                  : "미정"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">승인된 일시정지</span>
              <span className="font-medium text-blue-600">
                {pauseInfo.totalApprovedDays}일
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 font-semibold">
                최종 만료일
              </span>
              <span className="font-bold text-lg">
                {pauseInfo.finalExpirationDate
                  ? new Date(
                      pauseInfo.finalExpirationDate
                    ).toLocaleDateString()
                  : "미정"}
              </span>
            </div>
            <div className="divider my-2"></div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">일시정지 요청 횟수</span>
              <span className="font-medium">{pauseInfo.pauseCount}회</span>
            </div>
          </div>
        </div>
      </div>

      {/* 승인 대기중인 일시정지 목록 */}
      {pauseInfo.pendingPauses.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">승인 대기중</h4>
          {pauseInfo.pendingPauses.map((pause) => (
            <div
              key={pause.id}
              className="card bg-yellow-50 border border-yellow-300 shadow-sm"
            >
              <div className="card-body">
                <div className="flex items-center gap-2 mb-3">
                  <span className="badge badge-warning">승인 대기</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">시작일</span>
                    <span className="font-medium">
                      {new Date(pause.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">종료일</span>
                    <span className="font-medium">
                      {new Date(pause.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">기간</span>
                    <span className="font-medium text-yellow-700">
                      {pause.days}일
                    </span>
                  </div>
                  <div className="divider my-2"></div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">사유</p>
                    <p className="text-sm bg-white p-2 rounded">
                      {pause.reason}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 승인된 일시정지 목록 */}
      {pauseInfo.approvedPauses.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">승인된 일시정지</h4>
          {pauseInfo.approvedPauses.map((pause) => (
            <div
              key={pause.id}
              className="card bg-green-50 border border-green-200 shadow-sm"
            >
              <div className="card-body">
                <div className="flex items-center gap-2 mb-3">
                  <span className="badge badge-success">승인 완료</span>
                  {pause.approvedByManager && (
                    <span className="text-xs text-gray-600">
                      by {pause.approvedByManager.username}
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">시작일</span>
                    <span className="font-medium">
                      {new Date(pause.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">종료일</span>
                    <span className="font-medium">
                      {new Date(pause.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">기간</span>
                    <span className="font-medium text-green-700">
                      {pause.days}일
                    </span>
                  </div>
                  {pause.approvedAt && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">승인일</span>
                      <span className="text-sm text-gray-500">
                        {new Date(pause.approvedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="divider my-2"></div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">사유</p>
                    <p className="text-sm bg-white p-2 rounded">
                      {pause.reason}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 일시정지 추가 섹션 */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          {!isAdding ? (
            <button
              className="btn btn-primary btn-block"
              onClick={() => setIsAdding(true)}
            >
              일시정지 추가하기
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-lg">일시정지 추가</h4>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => {
                    setIsAdding(false);
                    setDateRange(undefined);
                    setReason("");
                  }}
                >
                  취소
                </button>
              </div>

              <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded">
                일시정지는 기본 최대 10일입니다. 특별한 사유가 존재하면 더 길게
                설정할 수 있습니다.
              </div>

              <div>
                <label className="label">
                  <span className="label-text font-medium">
                    일시정지 기간
                  </span>
                </label>
                <div className="text-xs text-gray-500 mb-2">
                  * 이미 신청된 일시정지 기간은 선택할 수 없습니다
                </div>
                <div className="bg-white p-3 rounded border">
                  <DayPicker
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    disabled={[
                      { before: new Date() },
                      ...getDisabledDates(),
                    ]}
                  />
                </div>
                {dateRange?.from && dateRange?.to && (
                  <div className="text-sm text-gray-600 mt-2">
                    {dateRange.from.toLocaleDateString()} ~{" "}
                    {dateRange.to.toLocaleDateString()} (
                    {Math.ceil(
                      (dateRange.to.getTime() - dateRange.from.getTime()) /
                        (1000 * 60 * 60 * 24)
                    ) + 1}
                    일)
                  </div>
                )}
              </div>

              <div>
                <label className="label">
                  <span className="label-text font-medium">사유</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  placeholder="일시정지 사유를 입력해주세요"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>

              <button
                className="btn btn-warning btn-block"
                onClick={handleSubmit}
                disabled={isSubmitting || !dateRange?.from || !dateRange?.to}
              >
                {isSubmitting ? "처리 중..." : "일시정지 요청하기"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
