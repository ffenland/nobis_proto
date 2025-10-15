"use client";

import { useState } from "react";
import useSWR from "swr";
import { GetPtStateInfoResult } from "@/app/services/trainer/pt.service";

interface PtStateProps {
  ptId: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PtState({ ptId }: PtStateProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const {
    data: stateInfo,
    error,
    isLoading,
    mutate,
  } = useSWR<GetPtStateInfoResult>(`/api/trainer/pt/${ptId}/state`, fetcher);

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

  if (error || !stateInfo) {
    return (
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <div className="text-red-500">PT 상태 정보를 불러올 수 없습니다.</div>
        </div>
      </div>
    );
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case "CONFIRMED":
        return "badge-success";
      case "FINISHED":
        return "badge-default";
      case "PENDING":
        return "badge-warning";
      case "REJECTED":
        return "badge-error";
      case "ACCEPTING":
        return "badge-info";
      default:
        return "badge-ghost";
    }
  };

  const getStateText = (state: string) => {
    switch (state) {
      case "CONFIRMED":
        return "진행중";
      case "FINISHED":
        return "종료됨";
      case "PENDING":
        return "대기중";
      case "REJECTED":
        return "거절됨";
      case "ACCEPTING":
        return "수락중";
      case "REFUNDED":
        return "중도해지";
      default:
        return state;
    }
  };

  const handleWithdraw = async () => {
    // 환불 정보 검증
    if (stateInfo.paymentState !== "REFUNDED") {
      alert("환불 처리를 먼저 진행해주세요");
      return;
    }

    if (!confirm("PT 상태를 중도해지로 변경하시겠습니까?")) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/trainer/pt/${ptId}/state`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ state: "REFUNDED" }),
      });

      if (!response.ok) {
        throw new Error("Failed to update PT state");
      }

      // 데이터 갱신
      await mutate();
      alert("PT 상태가 중도해지로 변경되었습니다");
    } catch (error) {
      console.error("Error updating PT state:", error);
      alert("상태 변경 중 오류가 발생했습니다");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinish = async () => {
    if (!confirm("PT를 완료 처리하시겠습니까?")) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/trainer/pt/${ptId}/state`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ state: "FINISHED" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to finish PT");
      }

      // 데이터 갱신
      await mutate();
      alert("PT가 완료 처리되었습니다");
    } catch (error) {
      console.error("Error finishing PT:", error);
      alert(
        error instanceof Error
          ? error.message
          : "완료 처리 중 오류가 발생했습니다"
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className=" bg-base-100 shadow-md">
      <div className="px-2">
        <div className="flex items-center justify-between">
          <h3 className="card-title">PT 상태 정보</h3>
        </div>

        <div className="space-y-4">
          {/* PT 상태 정보 */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-medium text-gray-600">
                  PT 상태
                </span>
                <p className="text-lg font-bold">{stateInfo.memberName}님</p>
              </div>
              <div>
                <span className={`badge ${getStateColor(stateInfo.state)}`}>
                  {getStateText(stateInfo.state)}
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              시작일: {new Date(stateInfo.startDate).toLocaleDateString()}
            </div>
          </div>

          {/* 상태 변경 옵션 (CONFIRMED 상태에만 표시) */}
          {stateInfo.state === "CONFIRMED" && (
            <div className="border-t pt-4 space-y-4">
              <div className="flex gap-2">
                {/* 완료처리 버튼 */}
                <button
                  className="btn btn-success flex-1"
                  onClick={handleFinish}
                  disabled={
                    isProcessing ||
                    !stateInfo.isLessonCountFull ||
                    !stateInfo.paymentState ||
                    stateInfo.paymentState === "PENDING"
                  }
                >
                  {isProcessing ? "처리 중..." : "완료처리"}
                </button>

                {/* 해약하기 버튼 */}
                <button
                  className="btn btn-error flex-1"
                  onClick={handleWithdraw}
                  disabled={
                    isProcessing ||
                    !stateInfo.paymentState ||
                    stateInfo.paymentState !== "REFUNDED"
                  }
                >
                  {isProcessing ? "처리 중..." : "해약하기"}
                </button>
              </div>

              {/* 안내 메시지 */}
              {!stateInfo.isLessonCountFull && (
                <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded">
                  모든 레슨이 등록되어야 완료처리가 가능합니다.
                </div>
              )}

              {(!stateInfo.paymentState ||
                stateInfo.paymentState === "PENDING") && (
                <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded">
                  결제가 완료되어야 완료처리가 가능합니다.
                </div>
              )}

              {(!stateInfo.paymentState ||
                stateInfo.paymentState !== "REFUNDED") && (
                <div className="text-sm text-gray-600 bg-red-50 p-3 rounded">
                  환불 정보가 먼저 등록되어야 해약이 가능합니다.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
