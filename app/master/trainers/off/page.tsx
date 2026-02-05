"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { GetTrainerOffsResult } from "@/app/services/master/master-trainer.service";
import type { SessionResponse } from "@/app/services/auth/auth.service";

// 데이터 페처
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// 휴무 유형 표시 함수
const formatOffTime = (startAt: string | Date, endAt: string | Date) => {
  const startDate = new Date(startAt);
  const endDate = new Date(endAt);

  const startHour = startDate.getHours();
  const startMinute = startDate.getMinutes();
  const endHour = endDate.getHours();
  const endMinute = endDate.getMinutes();

  // 종일 휴무 (00:00 ~ 23:59)
  if (
    startHour === 0 &&
    startMinute === 0 &&
    endHour === 23 &&
    endMinute === 59
  ) {
    return "종일휴무";
  }
  // 오전 휴무 (00:00 ~ 12:59)
  else if (
    startHour === 0 &&
    startMinute === 0 &&
    endHour === 12 &&
    endMinute === 59
  ) {
    return "오전반차";
  }
  // 오후 휴무 (13:00 ~ 23:59)
  else if (
    startHour === 13 &&
    startMinute === 0 &&
    endHour === 23 &&
    endMinute === 59
  ) {
    return "오후반차";
  }
  // 구체적인 시간대
  else {
    return `${format(startDate, "HH:mm")} ~ ${format(endDate, "HH:mm")}`;
  }
};

// 상태별 스타일 반환
const getStateStyle = (state: string) => {
  switch (state) {
    case "PENDING":
      return {
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        textColor: "text-yellow-800",
        badgeVariant: "warning" as const,
        badgeText: "승인 대기",
      };
    case "CONFIRMED":
      return {
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        textColor: "text-green-800",
        badgeVariant: "success" as const,
        badgeText: "승인 완료",
      };
    case "REJECTED":
      return {
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        textColor: "text-red-800",
        badgeVariant: "error" as const,
        badgeText: "거절",
      };
    default:
      return {
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200",
        textColor: "text-gray-800",
        badgeVariant: "default" as const,
        badgeText: "알 수 없음",
      };
  }
};

export default function TrainerOffManagementPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    id: string;
    state: "CONFIRMED" | "REJECTED";
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // API 데이터 가져오기
  const {
    data: trainerOffs,
    error,
    isLoading,
  } = useSWR<GetTrainerOffsResult>("/api/master/trainers/off", fetcher);

  // 세션 정보 가져오기
  const { data: session } = useSWR<SessionResponse>(
    "/api/auth/session",
    fetcher
  );

  // 상태 변경 함수
  const handleStateChange = async (
    id: string,
    state: "CONFIRMED" | "REJECTED"
  ) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/master/trainers/off", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, state }),
      });

      if (response.ok) {
        // SWR 데이터 재검증
        mutate("/api/master/trainers/off");
        setPendingAction(null);
        alert(
          state === "CONFIRMED"
            ? "휴무가 승인되었습니다."
            : "휴무가 거절되었습니다."
        );
      } else {
        const errorData = await response.json();
        alert(`상태 변경 실패: ${errorData.error || "알 수 없는 오류"}`);
      }
    } catch (error) {
      console.error("상태 변경 오류:", error);
      alert("상태 변경 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4 text-gray-600">휴무 신청 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>데이터를 불러오는 중 오류가 발생했습니다.</p>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary mt-4"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/master/trainers"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold">트레이너 휴무 관리</h1>
        </div>
        <p className="text-gray-600 ml-11">
          트레이너들의 휴무 신청을 승인하거나 거절할 수 있습니다
        </p>
      </div>

      {/* 휴무 목록 */}
      <div className="space-y-4">
        {trainerOffs && trainerOffs.length > 0 ? (
          trainerOffs.map((off) => {
            const style = getStateStyle(off.state);
            const isExpanded = expandedId === off.id;

            return (
              <Card
                key={off.id}
                className={`${style.bgColor} ${
                  style.borderColor
                } cursor-pointer transition-all duration-200 ${
                  isExpanded ? "shadow-lg" : "hover:shadow-md"
                }`}
                onClick={() => setExpandedId(isExpanded ? null : off.id)}
              >
                <CardContent className="p-4">
                  {/* 기본 정보 */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`font-medium ${style.textColor}`}>
                          {off.trainer.user.username} 트레이너
                        </h3>
                        <Badge variant={style.badgeVariant} className="text-xs">
                          {style.badgeText}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">날짜:</span>{" "}
                          {format(
                            new Date(off.startAt),
                            "yyyy년 M월 d일 (EEEE)",
                            {
                              locale: ko,
                            }
                          )}
                        </p>
                        <p>
                          <span className="font-medium">유형:</span>{" "}
                          {formatOffTime(off.startAt, off.endAt)}
                        </p>
                        <p>
                          <span className="font-medium">센터:</span>{" "}
                          {off.trainer.fitnessCenter?.title || "센터없음"}
                        </p>
                        {off.description && (
                          <p>
                            <span className="font-medium">사유:</span>{" "}
                            <span
                              className={`${!isExpanded ? "line-clamp-1" : ""}`}
                            >
                              {off.description}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 text-xs text-gray-500">
                      <span>신청일시</span>
                      <span>
                        {format(new Date(off.createdAt), "M/d HH:mm")}
                      </span>
                    </div>
                  </div>

                  {/* PENDING 상태일 때 승인/거절 버튼 - Master만 */}
                  {off.state === "PENDING" && session?.role === "MASTER" && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="default"
                          className="bg-green-600 text-white"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingAction({
                              id: off.id,
                              state: "CONFIRMED",
                            });
                          }}
                          disabled={isSubmitting}
                        >
                          승인
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingAction({ id: off.id, state: "REJECTED" });
                          }}
                          disabled={isSubmitting}
                        >
                          거절
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <p>휴무 신청이 없습니다.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 확인 모달 */}
      {pendingAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-semibold mb-4">상태 변경 확인</h3>
            <p className="text-gray-700 mb-6">
              정말로 이 휴무 신청을{" "}
              <span className="font-medium">
                {pendingAction.state === "CONFIRMED" ? "승인" : "거절"}
              </span>
              하시겠습니까?
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setPendingAction(null)}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button
                variant={
                  pendingAction.state === "CONFIRMED" ? "default" : "danger"
                }
                className={
                  pendingAction.state === "CONFIRMED"
                    ? "bg-green-600 text-white"
                    : ""
                }
                onClick={() =>
                  handleStateChange(pendingAction.id, pendingAction.state)
                }
                disabled={isSubmitting}
              >
                {isSubmitting ? "처리 중..." : "확인"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
