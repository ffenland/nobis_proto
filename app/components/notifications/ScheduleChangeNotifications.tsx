// app/components/notifications/ScheduleChangeNotifications.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { formatTime } from "@/app/lib/utils/time.utils";
import { formatDate } from "@/app/lib/utils";
import { IScheduleChangeRequestList } from "@/app/lib/services/pt-schedule-change.service";
import { Bell, Clock, ArrowRight, X } from "lucide-react";

// API 응답 타입 정의
interface ScheduleChangeListApiResponse {
  success: true;
  requests: IScheduleChangeRequestList;
}

interface ScheduleChangeListApiError {
  error: string;
}

type ScheduleChangeListResponse =
  | ScheduleChangeListApiResponse
  | ScheduleChangeListApiError;

// 타입 가드 함수
const isSuccessResponse = (
  data: unknown
): data is ScheduleChangeListApiResponse => {
  return (
    (data as ScheduleChangeListApiResponse).success === true &&
    Array.isArray((data as ScheduleChangeListApiResponse).requests)
  );
};

const isErrorResponse = (data: unknown): data is ScheduleChangeListApiError => {
  return typeof (data as ScheduleChangeListApiError).error === "string";
};

// 알림 항목 타입 정의
interface INotificationItem {
  id: string;
  type: "request" | "response";
  title: string;
  message: string;
  state: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "EXPIRED";
  createdAt: Date;
  expiresAt?: Date;
  ptInfo: {
    id: string;
    title: string;
    memberName?: string;
    trainerName?: string;
  };
  isMyRequest: boolean;
}

interface IScheduleChangeNotificationsProps {
  className?: string;
  maxItems?: number;
}

// 상태별 스타일 반환 함수
const getStateStyle = (state: string) => {
  switch (state) {
    case "PENDING":
      return {
        variant: "default" as const,
        text: "대기중",
        bgColor: "bg-amber-50 border-amber-200",
        textColor: "text-amber-700",
        icon: Clock,
      };
    case "APPROVED":
      return {
        variant: "default" as const,
        text: "승인됨",
        bgColor: "bg-emerald-50 border-emerald-200",
        textColor: "text-emerald-700",
        icon: ArrowRight,
      };
    case "REJECTED":
      return {
        variant: "default" as const,
        text: "거절됨",
        bgColor: "bg-red-50 border-red-200",
        textColor: "text-red-700",
        icon: X,
      };
    case "EXPIRED":
      return {
        variant: "default" as const,
        text: "만료됨",
        bgColor: "bg-gray-50 border-gray-200",
        textColor: "text-gray-500",
        icon: Clock,
      };
    case "CANCELLED":
      return {
        variant: "default" as const,
        text: "취소됨",
        bgColor: "bg-gray-50 border-gray-200",
        textColor: "text-gray-500",
        icon: X,
      };
    default:
      return {
        variant: "default" as const,
        text: "알 수 없음",
        bgColor: "bg-gray-50 border-gray-200",
        textColor: "text-gray-500",
        icon: Bell,
      };
  }
};

// 요청 데이터를 알림 형태로 변환
const transformRequestsToNotifications = (
  requests: IScheduleChangeRequestList
): INotificationItem[] => {
  return requests
    .filter((request) => {
      // 최근 7일 이내의 알림만 표시
      const daysDiff =
        (new Date().getTime() - new Date(request.createdAt).getTime()) /
        (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    })
    .map((request): INotificationItem => {
      // 만료 여부 체크
      const isExpired = new Date() > new Date(request.expiresAt);
      const finalState = isExpired ? "EXPIRED" : request.state;

      return {
        id: request.id,
        type: "request", // 서비스에서 이미 본인에게 온 요청만 가져오므로
        title: "새로운 일정 변경 요청",
        message: `${request.requestorName}님이 일정 변경을 요청했습니다`,
        state: finalState as
          | "PENDING"
          | "APPROVED"
          | "REJECTED"
          | "CANCELLED"
          | "EXPIRED",
        createdAt: new Date(request.createdAt),
        expiresAt: new Date(request.expiresAt),
        ptInfo: request.ptInfo,
        isMyRequest: false, // 서비스에서 이미 본인에게 온 요청만 가져오므로
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

// 알림 항목 컴포넌트
const NotificationItem: React.FC<{
  notification: INotificationItem;
  onViewDetail: (id: string) => void;
}> = ({ notification, onViewDetail }) => {
  const stateStyle = getStateStyle(notification.state);
  const IconComponent = stateStyle.icon;

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${stateStyle.bgColor} border`}
      onClick={() => onViewDetail(notification.ptInfo.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className={`mt-1 ${stateStyle.textColor}`}>
              <IconComponent size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {notification.title}
                </h4>
                <Badge variant={stateStyle.variant} className="ml-2 shrink-0">
                  {stateStyle.text}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {notification.message}
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <div>수업: {notification.ptInfo.title}</div>
                <div>
                  {notification.isMyRequest
                    ? `상대방: ${
                        notification.ptInfo.trainerName ||
                        notification.ptInfo.memberName
                      }`
                    : `요청자: ${
                        notification.ptInfo.memberName ||
                        notification.ptInfo.trainerName
                      }`}
                </div>
                <div>
                  {formatDate(notification.createdAt)}{" "}
                  {formatTime(
                    notification.createdAt.getHours() * 100 +
                      notification.createdAt.getMinutes()
                  )}
                </div>
                {notification.state === "PENDING" && notification.expiresAt && (
                  <div className="text-amber-600">
                    만료: {formatDate(notification.expiresAt)}{" "}
                    {formatTime(
                      notification.expiresAt.getHours() * 100 +
                        notification.expiresAt.getMinutes()
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 메인 알림 컴포넌트
export default function ScheduleChangeNotifications({
  className = "",
  maxItems = 5,
}: IScheduleChangeNotificationsProps) {
  const [notifications, setNotifications] = useState<INotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 알림 데이터 조회
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/schedule-change/list");
      const data: ScheduleChangeListResponse = await response.json();

      if (response.ok && isSuccessResponse(data)) {
        const transformedNotifications = transformRequestsToNotifications(
          data.requests
        );

        setNotifications(transformedNotifications.slice(0, maxItems));
      } else if (isErrorResponse(data)) {
        setError(data.error);
      } else {
        setError("알림을 불러올 수 없습니다.");
      }
    } catch (error) {
      console.error("알림 조회 실패:", error);
      setError("알림을 불러올 수 없습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const effectAction = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/schedule-change/list");
        const data: ScheduleChangeListResponse = await response.json();

        if (response.ok && isSuccessResponse(data)) {
          const transformedNotifications = transformRequestsToNotifications(
            data.requests
          );

          setNotifications(transformedNotifications.slice(0, maxItems));
        } else if (isErrorResponse(data)) {
          setError(data.error);
        } else {
          setError("알림을 불러올 수 없습니다.");
        }
      } catch (error) {
        console.error("알림 조회 실패:", error);
        setError("알림을 불러올 수 없습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    effectAction();
  }, [maxItems]);

  // PT 상세 페이지로 이동
  const handleViewDetail = (ptId: string) => {
    // 현재 경로에 따라 적절한 PT 상세 페이지로 이동
    const currentPath = window.location.pathname;
    if (currentPath.includes("/trainer/")) {
      window.location.href = `/trainer/pt/${ptId}`;
    } else if (currentPath.includes("/member/")) {
      window.location.href = `/member/pt/${ptId}`;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-gray-500">
            <Bell size={20} />
            <span>알림을 불러오는 중...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <p className="mb-2">{error}</p>
            <Button variant="outline" onClick={fetchNotifications}>
              다시 시도
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Bell size={32} className="mx-auto mb-2 text-gray-300" />
            <p>새로운 알림이 없습니다</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Bell size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            일정 변경 알림
          </h3>
          {notifications.filter((n) => n.state === "PENDING").length > 0 && (
            <Badge variant="default" className="bg-red-100 text-red-700">
              {notifications.filter((n) => n.state === "PENDING").length}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onViewDetail={handleViewDetail}
          />
        ))}
      </div>

      {notifications.length >= maxItems && (
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={fetchNotifications}>
            더 보기
          </Button>
        </div>
      )}
    </div>
  );
}
