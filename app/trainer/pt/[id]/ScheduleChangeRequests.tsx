// app/trainer/pt/[id]/ScheduleChangeRequests.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import {
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
} from "@/app/components/ui/Modal";
import { Textarea } from "@/app/components/ui/Input";
import {
  Clock,
  Calendar,
  User,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { formatDateThisYear, formatTimeToString } from "@/app/lib/utils";
import { type IScheduleChangeRequestItem } from "@/app/lib/services/pt-schedule-change.service";

interface ScheduleChangeRequestsProps {
  ptId: string;
}

const ScheduleChangeRequests = ({ ptId }: ScheduleChangeRequestsProps) => {
  const [requests, setRequests] = useState<IScheduleChangeRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<IScheduleChangeRequestItem | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // 요청 목록 조회
  const fetchRequests = async () => {
    try {
      const response = await fetch("/api/schedule-change/list");
      const data = await response.json();

      if (response.ok) {
        // 현재 PT에 관련된 요청만 필터링
        const ptRequests = data.requests.filter(
          (req: IScheduleChangeRequestItem) => req.ptInfo.id === ptId
        );
        setRequests(ptRequests);
      }
    } catch (error) {
      console.error("요청 목록 조회 실패:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [ptId]);

  // 상태별 스타일
  const getStateStyle = (state: string) => {
    switch (state) {
      case "PENDING":
        return {
          variant: "warning" as const,
          text: "대기중",
          bgColor: "bg-yellow-50 border-yellow-200",
          icon: AlertCircle,
        };
      case "APPROVED":
        return {
          variant: "success" as const,
          text: "승인됨",
          bgColor: "bg-green-50 border-green-200",
          icon: CheckCircle,
        };
      case "REJECTED":
        return {
          variant: "error" as const,
          text: "거절됨",
          bgColor: "bg-red-50 border-red-200",
          icon: XCircle,
        };
      case "EXPIRED":
        return {
          variant: "default" as const,
          text: "만료됨",
          bgColor: "bg-gray-50 border-gray-200",
          icon: Clock,
        };
      case "CANCELLED":
        return {
          variant: "default" as const,
          text: "취소됨",
          bgColor: "bg-gray-50 border-gray-200",
          icon: XCircle,
        };
      default:
        return {
          variant: "default" as const,
          text: "알 수 없음",
          bgColor: "bg-gray-50 border-gray-200",
          icon: AlertCircle,
        };
    }
  };

  // 응답 모달 열기
  const handleResponseClick = (request: IScheduleChangeRequestItem) => {
    setSelectedRequest(request);
    setResponseMessage("");
    setShowResponseModal(true);
  };

  // 요청 승인
  const handleApprove = async () => {
    if (!selectedRequest) return;

    setIsProcessing(true);
    try {
      const response = await fetch(
        `/api/schedule-change/approve/${selectedRequest.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            responseMessage: responseMessage || "승인되었습니다.",
          }),
        }
      );

      if (response.ok) {
        alert("일정 변경이 승인되었습니다.");
        setShowResponseModal(false);
        fetchRequests(); // 목록 새로고침
        // 페이지 새로고침으로 변경된 일정 반영
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || "승인 처리 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("승인 처리 실패:", error);
      alert("승인 처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 요청 거절
  const handleReject = async () => {
    if (!selectedRequest || !responseMessage.trim()) {
      alert("거절 사유를 입력해주세요.");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(
        `/api/schedule-change/reject/${selectedRequest.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            responseMessage,
          }),
        }
      );

      if (response.ok) {
        alert("일정 변경이 거절되었습니다.");
        setShowResponseModal(false);
        fetchRequests(); // 목록 새로고침
      } else {
        const data = await response.json();
        alert(data.error || "거절 처리 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("거절 처리 실패:", error);
      alert("거절 처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 요청 취소
  const handleCancel = async (requestId: string) => {
    if (!confirm("정말 요청을 취소하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/schedule-change/cancel/${requestId}`, {
        method: "POST",
      });

      if (response.ok) {
        alert("요청이 취소되었습니다.");
        fetchRequests(); // 목록 새로고침
      } else {
        const data = await response.json();
        alert(data.error || "취소 처리 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("취소 처리 실패:", error);
      alert("취소 처리 중 오류가 발생했습니다.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">로딩 중...</span>
      </div>
    );
  }

  if (requests.length === 0) {
    return null; // 요청이 없으면 아무것도 표시하지 않음
  }

  return (
    <>
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900">일정 변경 요청 내역</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRequests}
            className="flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </Button>
        </div>

        <div className="space-y-3">
          {requests.map((request) => {
            const style = getStateStyle(request.state);
            const IconComponent = style.icon;

            return (
              <div
                key={request.id}
                className={`border rounded-lg p-4 ${style.bgColor}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <IconComponent className="w-5 h-5" />
                      <div className="font-medium">
                        {request.isMyRequest
                          ? "내가 요청"
                          : `${request.requestorName}님이 요청`}
                      </div>
                      <Badge variant={style.variant}>{style.text}</Badge>
                    </div>

                    {/* 일정 정보 */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">현재:</span>
                          <span>
                            {formatDateThisYear(
                              new Date(request.currentSchedule.date)
                            )}{" "}
                            {formatTimeToString(
                              Math.floor(
                                request.currentSchedule.startTime / 100
                              ),
                              request.currentSchedule.startTime % 100
                            )}
                            -
                            {formatTimeToString(
                              Math.floor(request.currentSchedule.endTime / 100),
                              request.currentSchedule.endTime % 100
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          <span className="text-gray-600">변경:</span>
                          <span className="font-medium text-blue-700">
                            {formatDateThisYear(
                              new Date(request.requestedSchedule.date)
                            )}{" "}
                            {formatTimeToString(
                              Math.floor(
                                request.requestedSchedule.startTime / 100
                              ),
                              request.requestedSchedule.startTime % 100
                            )}
                            -
                            {formatTimeToString(
                              Math.floor(
                                request.requestedSchedule.endTime / 100
                              ),
                              request.requestedSchedule.endTime % 100
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 사유 */}
                    <div className="mt-3 p-3 bg-white rounded border">
                      <div className="text-sm font-medium text-gray-700 mb-1">
                        변경 사유
                      </div>
                      <div className="text-sm text-gray-600">
                        {request.reason}
                      </div>
                    </div>

                    {/* 응답 메시지 */}
                    {request.responseMessage && (
                      <div className="mt-3 p-3 bg-white rounded border">
                        <div className="text-sm font-medium text-gray-700 mb-1">
                          {request.responderName}님의 응답
                        </div>
                        <div className="text-sm text-gray-600">
                          {request.responseMessage}
                        </div>
                      </div>
                    )}

                    {/* 날짜 정보 */}
                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                      <div>
                        요청일:{" "}
                        {formatDateThisYear(new Date(request.createdAt))}
                      </div>
                      {request.respondedAt && (
                        <div>
                          응답일:{" "}
                          {formatDateThisYear(new Date(request.respondedAt))}
                        </div>
                      )}
                      {request.state === "PENDING" && (
                        <div>
                          만료일:{" "}
                          {formatDateThisYear(new Date(request.expiresAt))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="ml-4 flex flex-col gap-2">
                    {request.canRespond && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleResponseClick(request)}
                      >
                        응답하기
                      </Button>
                    )}
                    {request.isMyRequest && request.state === "PENDING" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancel(request.id)}
                      >
                        취소
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 응답 모달 */}
      <Modal
        isOpen={showResponseModal}
        onClose={() => setShowResponseModal(false)}
      >
        <ModalHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            일정 변경 요청 응답
          </div>
        </ModalHeader>
        <ModalContent>
          {selectedRequest && (
            <div className="space-y-4">
              {/* 요청 정보 요약 */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  {selectedRequest.requestorName}님의 일정 변경 요청
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      현재:{" "}
                      {formatDateThisYear(
                        new Date(selectedRequest.currentSchedule.date)
                      )}
                    </span>
                    <span>
                      {formatTimeToString(
                        Math.floor(
                          selectedRequest.currentSchedule.startTime / 100
                        ),
                        selectedRequest.currentSchedule.startTime % 100
                      )}
                      -
                      {formatTimeToString(
                        Math.floor(
                          selectedRequest.currentSchedule.endTime / 100
                        ),
                        selectedRequest.currentSchedule.endTime % 100
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span>
                      변경:{" "}
                      {formatDateThisYear(
                        new Date(selectedRequest.requestedSchedule.date)
                      )}
                    </span>
                    <span className="font-medium text-blue-700">
                      {formatTimeToString(
                        Math.floor(
                          selectedRequest.requestedSchedule.startTime / 100
                        ),
                        selectedRequest.requestedSchedule.startTime % 100
                      )}
                      -
                      {formatTimeToString(
                        Math.floor(
                          selectedRequest.requestedSchedule.endTime / 100
                        ),
                        selectedRequest.requestedSchedule.endTime % 100
                      )}
                    </span>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-white rounded border">
                  <div className="text-sm font-medium text-gray-700 mb-1">
                    변경 사유
                  </div>
                  <div className="text-sm text-gray-600">
                    {selectedRequest.reason}
                  </div>
                </div>
              </div>

              {/* 응답 메시지 입력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  응답 메시지
                </label>
                <Textarea
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  placeholder="승인 또는 거절 사유를 입력해주세요"
                  rows={3}
                />
              </div>
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowResponseModal(false)}>
            취소
          </Button>
          <Button
            variant="danger"
            onClick={handleReject}
            disabled={isProcessing}
          >
            {isProcessing ? "처리 중..." : "거절"}
          </Button>
          <Button
            variant="primary"
            onClick={handleApprove}
            disabled={isProcessing}
          >
            {isProcessing ? "처리 중..." : "승인"}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default ScheduleChangeRequests;
