// app/trainer/pt/[id]/[ptRecordId]/scheduleChange/ScheduleChangeRequestsList.tsx
"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { formatDateThisYear, formatTimeToString } from "@/app/lib/utils";
import { 
  approveScheduleChangeRequestAction,
  rejectScheduleChangeRequestAction,
  cancelScheduleChangeRequestAction, 
  type TScheduleChangeRequest 
} from "./actions";
import { useRouter } from "next/navigation";
import {
  Clock,
  Calendar,
  User,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface ScheduleChangeRequestsListProps {
  requests: TScheduleChangeRequest[];
  ptRecordId: string;
  currentUser: {
    id: string;
    role: string;
  };
}

const ScheduleChangeRequestsList = ({ requests, currentUser }: ScheduleChangeRequestsListProps) => {
  const router = useRouter();
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [responseReason, setResponseReason] = useState<{ [key: string]: string }>({});

  const handleResponse = async (requestId: string, status: "APPROVED" | "REJECTED") => {
    setProcessingRequestId(requestId);

    try {
      if (status === "APPROVED") {
        await approveScheduleChangeRequestAction(
          requestId,
          responseReason[requestId] || undefined
        );
      } else {
        await rejectScheduleChangeRequestAction(
          requestId,
          responseReason[requestId] || undefined
        );
      }

      const action = status === "APPROVED" ? "승인" : "거절";
      alert(`일정 변경 요청이 ${action}되었습니다.`);
      router.refresh();
    } catch (error) {
      console.error("응답 처리 오류:", error);
      alert(error instanceof Error ? error.message : "처리 중 오류가 발생했습니다.");
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleCancel = async (requestId: string) => {
    setProcessingRequestId(requestId);

    try {
      await cancelScheduleChangeRequestAction(requestId);
      alert("일정 변경 요청이 취소되었습니다.");
      router.refresh();
    } catch (error) {
      console.error("취소 처리 오류:", error);
      alert(error instanceof Error ? error.message : "취소 중 오류가 발생했습니다.");
    } finally {
      setProcessingRequestId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="warning">대기 중</Badge>;
      case "APPROVED":
        return <Badge variant="success">승인됨</Badge>;
      case "REJECTED":
        return <Badge variant="error">거절됨</Badge>;
      case "CANCELLED":
        return <Badge variant="default">취소됨</Badge>;
      default:
        return <Badge variant="default">알 수 없음</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case "APPROVED":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "REJECTED":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "CANCELLED":
        return <XCircle className="w-5 h-5 text-gray-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>일정 변경 요청이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div
          key={request.id}
          className={`border rounded-lg p-4 ${
            request.state === "PENDING"
              ? "bg-yellow-50 border-yellow-200"
              : request.state === "APPROVED"
              ? "bg-green-50 border-green-200"
              : request.state === "REJECTED"
              ? "bg-red-50 border-red-200"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {getStatusIcon(request.state)}
              <div>
                <div className="font-medium text-gray-900">
                  일정 변경 요청
                </div>
                <div className="text-sm text-gray-600">
                  {formatDateThisYear(request.createdAt)} 요청
                </div>
              </div>
            </div>
            {getStatusBadge(request.state)}
          </div>

          {/* 요청자 정보 */}
          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <User className="w-4 h-4" />
              요청자: {request.requestor.username} ({request.requestor.role === "TRAINER" ? "트레이너" : "회원"})
            </div>
          </div>

          {/* 변경 희망 일정 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <div>
                <div className="text-sm text-gray-600">변경 희망 날짜</div>
                <div className="font-medium">
                  {formatDateThisYear(request.requestedDate)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <div>
                <div className="text-sm text-gray-600">변경 희망 시간</div>
                <div className="font-medium">
                  {formatTimeToString(
                    Math.floor(request.requestedStartTime / 100),
                    request.requestedStartTime % 100
                  )}{" "}
                  -{" "}
                  {formatTimeToString(
                    Math.floor(request.requestedEndTime / 100),
                    request.requestedEndTime % 100
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 변경 사유 */}
          {request.reason && (
            <div className="mb-4 p-3 bg-white rounded-lg border">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <MessageSquare className="w-4 h-4" />
                변경 사유
              </div>
              <div className="text-sm text-gray-600">{request.reason}</div>
            </div>
          )}

          {/* 응답 정보 (승인/거절된 경우) */}
          {request.state !== "PENDING" && (
            <div className="mb-4 p-3 bg-white rounded-lg border">
              <div className="text-sm font-medium text-gray-700 mb-1">
                응답자: {request.responder?.username || "알 수 없음"}
              </div>
              {request.responseMessage && (
                <div className="text-sm text-gray-600">
                  {request.responseMessage}
                </div>
              )}
            </div>
          )}

          {/* 대기 중인 요청에 대한 액션 버튼 */}
          {request.state === "PENDING" && (
            <div className="space-y-3">
              {/* 본인이 요청한 경우 - 취소 버튼만 표시 */}
              {request.requestor.id === currentUser.id ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel(request.id)}
                    disabled={processingRequestId === request.id}
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    {processingRequestId === request.id ? "취소 중..." : "요청 취소"}
                  </Button>
                </div>
              ) : (
                /* 상대방이 요청한 경우 - 승인/거절 버튼 표시 */
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      응답 메시지 (선택사항)
                    </label>
                    <textarea
                      value={responseReason[request.id] || ""}
                      onChange={(e) =>
                        setResponseReason(prev => ({
                          ...prev,
                          [request.id]: e.target.value
                        }))
                      }
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="승인/거절 사유를 입력해주세요..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleResponse(request.id, "APPROVED")}
                      disabled={processingRequestId === request.id}
                      className="flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      {processingRequestId === request.id ? "처리 중..." : "승인"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResponse(request.id, "REJECTED")}
                      disabled={processingRequestId === request.id}
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      {processingRequestId === request.id ? "처리 중..." : "거절"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ScheduleChangeRequestsList;