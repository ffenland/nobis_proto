"use client";

import { useState } from "react";
import useSWR from "swr";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { LoadingPage, ErrorMessage } from "@/app/components/ui/Loading";
import { formatDateTimeKR } from "@/app/lib/utils/time.utils";
import { ChevronDown, ChevronUp, Filter, AlertTriangle } from "lucide-react";
import type { GetAuditLogsResult } from "@/app/lib/services/audit/pt-record-audit.service";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const actionLabels = {
  CREATE_ITEM: "운동 기록 생성",
  UPDATE_ITEM: "운동 기록 수정",
  DELETE_ITEM: "운동 기록 삭제",
  CREATE_RECORD: "PT 기록 생성",
  UPDATE_RECORD: "PT 기록 수정",
};

export default function AuditLogsPage() {
  const [filters, setFilters] = useState({
    trainerId: "",
    onlyOutOfTime: false,
    action: "",
    startDate: "",
    endDate: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const limit = 20;

  // URL 파라미터 생성
  const queryParams = new URLSearchParams();
  if (filters.trainerId) queryParams.append("trainerId", filters.trainerId);
  if (filters.onlyOutOfTime) queryParams.append("onlyOutOfTime", "true");
  if (filters.action) queryParams.append("action", filters.action);
  if (filters.startDate) queryParams.append("startDate", filters.startDate);
  if (filters.endDate) queryParams.append("endDate", filters.endDate);
  queryParams.append("limit", limit.toString());
  queryParams.append("offset", (page * limit).toString());

  const { data, error, isLoading, mutate } = useSWR<GetAuditLogsResult>(
    `/api/manager/audit-logs?${queryParams.toString()}`,
    fetcher
  );

  if (isLoading) {
    return <LoadingPage message="감사 로그를 불러오는 중..." />;
  }

  if (error) {
    return (
      <PageLayout maxWidth="xl">
        <ErrorMessage
          message="감사 로그를 불러올 수 없습니다."
          action={
            <Button variant="outline" onClick={() => mutate()}>
              다시 시도
            </Button>
          }
        />
      </PageLayout>
    );
  }

  const totalPages = Math.ceil((data?.total || 0) / limit);

  return (
    <PageLayout maxWidth="xl">
      <PageHeader
        title="PT 기록 감사 로그"
        subtitle="트레이너들의 PT 기록 작업 내역을 확인합니다"
      />

      {/* 필터 섹션 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">필터</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? "필터 숨기기" : "필터 표시"}
            </Button>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  작업 유형
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={filters.action}
                  onChange={(e) =>
                    setFilters({ ...filters, action: e.target.value })
                  }
                >
                  <option value="">전체</option>
                  {Object.entries(actionLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  시작 날짜
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters({ ...filters, startDate: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  종료 날짜
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters({ ...filters, endDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 mr-2"
                  checked={filters.onlyOutOfTime}
                  onChange={(e) =>
                    setFilters({ ...filters, onlyOutOfTime: e.target.checked })
                  }
                />
                <span className="text-sm text-gray-700">
                  비정상 시간대 작업만 보기
                </span>
              </label>

              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilters({
                      trainerId: "",
                      onlyOutOfTime: false,
                      action: "",
                      startDate: "",
                      endDate: "",
                    });
                    setPage(0);
                  }}
                >
                  초기화
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setPage(0);
                    mutate();
                  }}
                >
                  적용
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 로그 목록 */}
      <Card>
        <CardContent className="p-0">
          {data?.logs?.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              조회된 감사 로그가 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {data?.logs?.map((log) => (
                <div key={log.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium text-gray-900">
                          {log.trainer.user.username}
                        </span>
                        <Badge variant={log.isOutOfTime ? "error" : "default"}>
                          {
                            actionLabels[
                              log.action as keyof typeof actionLabels
                            ]
                          }
                        </Badge>
                        {log.isOutOfTime && (
                          <div className="flex items-center text-red-600 text-sm">
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            비정상 시간
                          </div>
                        )}
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        <div>
                          회원:{" "}
                          {log.ptRecord.pt.member?.user.username ||
                            "알 수 없음"}
                        </div>
                        <div>
                          작업 시간: {formatDateTimeKR(new Date(log.createdAt))}
                        </div>
                        {log.scheduledTime && (
                          <div>
                            예정 시간:{" "}
                            {formatDateTimeKR(new Date(log.scheduledTime))}
                          </div>
                        )}
                        {log.notes && (
                          <div className="text-red-600">{log.notes}</div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpandedLogId(
                          expandedLogId === log.id ? null : log.id
                        )
                      }
                    >
                      {expandedLogId === log.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {/* 상세 정보 */}
                  {expandedLogId === log.id && log.actionDetails && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">
                        상세 내역
                      </h4>
                      <pre className="text-xs text-gray-700 overflow-x-auto">
                        {JSON.stringify(log.actionDetails, null, 2)}
                      </pre>
                      {log.ipAddress && (
                        <div className="mt-2 text-xs text-gray-500">
                          IP: {log.ipAddress}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 0}
          >
            이전
          </Button>

          <span className="text-sm text-gray-600">
            {page + 1} / {totalPages} 페이지
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages - 1}
          >
            다음
          </Button>
        </div>
      )}
    </PageLayout>
  );
}
