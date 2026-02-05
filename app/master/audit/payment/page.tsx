"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Loading";
import { Info, ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatDateWithoutWeekday,
  formatYYYYMMToKorean,
  formatDateToYYYYMM,
  getElapsedTime,
} from "@/app/lib/utils/time.utils";
import type { GetPaymentsByMonthResult } from "@/app/services/master/audit.service";

// ===== Fetcher =====

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// ===== 메인 컴포넌트 =====

export default function PaymentAuditPage() {
  // 현재 월을 기본값으로 설정
  const currentMonth = formatDateToYYYYMM(new Date());
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [activeTab, setActiveTab] = useState<
    "pending" | "completed" | "refunded" | "other"
  >("pending");

  // 데이터 페칭
  const { data, error, isLoading } = useSWR<GetPaymentsByMonthResult>(
    `/api/master/audit/payment?date=${selectedMonth}`,
    fetcher
  );

  // 월 이동 함수
  const goToPreviousMonth = () => {
    const year = parseInt(selectedMonth.substring(0, 4));
    const month = parseInt(selectedMonth.substring(4, 6));
    const prevDate = new Date(year, month - 2, 1); // month-2 because month is 1-based, and we want previous month
    setSelectedMonth(formatDateToYYYYMM(prevDate));
  };

  const goToNextMonth = () => {
    const year = parseInt(selectedMonth.substring(0, 4));
    const month = parseInt(selectedMonth.substring(4, 6));
    const nextDate = new Date(year, month, 1); // month index gives us next month
    setSelectedMonth(formatDateToYYYYMM(nextDate));
  };

  // 결제 방법 표시 함수
  const getMethodLabel = (method: string) => {
    const methodMap: Record<string, string> = {
      CARD: "카드",
      TRANSFER: "계좌이체",
      CASH: "현금",
    };
    return methodMap[method] || method;
  };

  // 합계 금액 계산
  const getTotalAmount = useMemo(() => {
    if (!data) return 0;

    if (activeTab === "pending") {
      return data.pendingPayments.reduce((sum, p) => sum + p.amount, 0);
    } else if (activeTab === "completed") {
      return data.completedPayments.reduce((sum, p) => sum + p.amount, 0);
    } else if (activeTab === "refunded") {
      return data.refundedPayments.reduce(
        (sum, p) => sum + (p.refundAmount || 0),
        0
      );
    }
    return 0;
  }, [data, activeTab]);

  // "기타" 탭은 otherCount가 0보다 큰 경우에만 표시
  const showOtherTab = data ? data.otherCount > 0 : false;

  // 현재 탭에 따라 표시할 데이터 선택
  const currentData =
    !data || isLoading
      ? []
      : activeTab === "pending"
        ? data.pendingPayments
        : activeTab === "completed"
          ? data.completedPayments
          : activeTab === "refunded"
            ? data.refundedPayments
            : data.otherPayments;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          결제 내역 관리
        </h1>
        <p className="text-gray-600 mb-3">
          월별 PT 결제 내역을 조회하고 관리합니다
        </p>
      </div>

      {/* 월 선택 */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={goToPreviousMonth}
            className="btn btn-sm btn-circle"
            aria-label="이전 월"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-xl font-semibold min-w-[120px] text-center">
            {formatYYYYMMToKorean(selectedMonth)}
          </div>
          <button
            onClick={goToNextMonth}
            className="btn btn-sm btn-circle"
            aria-label="다음 월"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div className="tabs tabs-boxed bg-base-200 mb-6">
        <button
          className={`tab ${activeTab === "pending" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          미결제{" "}
          <Badge variant="warning">{data?.pendingCount ?? 0}</Badge>
        </button>
        <button
          className={`tab ${activeTab === "completed" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("completed")}
        >
          결제완료{" "}
          <Badge variant="success">{data?.completedCount ?? 0}</Badge>
        </button>
        <button
          className={`tab ${activeTab === "refunded" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("refunded")}
        >
          환불 <Badge variant="default">{data?.refundedCount ?? 0}</Badge>
        </button>
        {showOtherTab && (
          <button
            className={`tab ${activeTab === "other" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("other")}
          >
            기타 <Badge variant="default">{data?.otherCount ?? 0}</Badge>
          </button>
        )}
      </div>

      {/* 합계 금액 표시 (미결제, 결제완료, 환불만) */}
      {!isLoading &&
        activeTab !== "other" &&
        currentData.length > 0 &&
        !error && (
          <Card className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-700">
                  {activeTab === "pending" && "미결제 합계"}
                  {activeTab === "completed" && "결제완료 합계"}
                  {activeTab === "refunded" && "환불 합계"}
                </span>
                <span
                  className={`text-2xl font-bold ${
                    activeTab === "refunded" ? "text-red-700" : "text-blue-700"
                  }`}
                >
                  {getTotalAmount.toLocaleString()}원
                </span>
              </div>
            </CardContent>
          </Card>
        )}

      {/* 결제 카드 목록 */}
      <div className="space-y-4">
        {/* 로딩 상태 */}
        {isLoading ? (
          <Card>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12">
                <div className="loading loading-spinner loading-lg text-primary"></div>
                <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          /* 에러 상태 */
          <Card>
            <CardContent>
              <div className="text-center text-red-500 py-8">
                <p>결제 내역을 불러올 수 없습니다.</p>
              </div>
            </CardContent>
          </Card>
        ) : currentData.length === 0 ? (
          /* 빈 데이터 */
          <Card>
            <CardContent>
              <div className="text-center py-12">
                <Info className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600">
                  {activeTab === "pending" && "미결제 내역이 없습니다."}
                  {activeTab === "completed" && "결제 완료 내역이 없습니다."}
                  {activeTab === "refunded" && "환불 내역이 없습니다."}
                  {activeTab === "other" && "기타 내역이 없습니다."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* 데이터 목록 */
          currentData.map((payment) => (
            <Card
              key={payment.id}
              className={
                activeTab === "pending"
                  ? "border-orange-200 bg-orange-50/30"
                  : activeTab === "refunded"
                    ? "border-red-200 bg-red-50/30"
                    : "border-gray-200 bg-white"
              }
            >
              <CardContent className="p-6">
                {/* 금액 및 결제 방법 */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    {/* 환불인 경우 refundAmount 표시 */}
                    {activeTab === "refunded" && payment.refundAmount ? (
                      <>
                        <div className="text-2xl font-bold text-red-700">
                          {payment.refundAmount.toLocaleString()}원
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          최초 결제금액: {payment.amount.toLocaleString()}원
                          {payment.deduction > 0 && (
                            <span className="ml-2">
                              (차감: {payment.deduction.toLocaleString()}원)
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-gray-900">
                          {payment.amount.toLocaleString()}원
                        </div>
                        {payment.discount > 0 && (
                          <div className="text-sm text-gray-600 mt-1">
                            할인: {payment.discount.toLocaleString()}원
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <Badge
                    variant="default"
                    className="text-sm bg-blue-100 text-blue-800"
                  >
                    {getMethodLabel(payment.method)}
                  </Badge>
                </div>

                {/* 트레이너 및 회원 정보 */}
                <div className="text-sm text-gray-700 mb-2">
                  <span className="font-medium">트레이너:</span>{" "}
                  {payment.pt.trainerName}
                  <span className="mx-2 text-gray-400">|</span>
                  <span className="font-medium">회원:</span>{" "}
                  {payment.pt.memberName}
                </div>

                {/* PT 상태가 CONFIRMED인 경우에만 수업 시작일 표시 (환불 제외) */}
                {payment.pt.state === "CONFIRMED" &&
                  activeTab !== "refunded" && (
                    <div className="text-sm text-gray-600 mb-3">
                      <span className="font-medium">수업 시작일:</span>{" "}
                      {formatDateWithoutWeekday(payment.pt.startDate)}
                    </div>
                  )}

                {/* 날짜 정보 */}
                <div className="text-sm text-gray-600">
                  {activeTab === "completed" && payment.paidAt && (
                    <div>
                      <span className="font-medium">결제일:</span>{" "}
                      {formatDateWithoutWeekday(payment.paidAt)}
                    </div>
                  )}
                  {activeTab === "refunded" && payment.refundedAt && (
                    <div>
                      <span className="font-medium">환불일:</span>{" "}
                      {formatDateWithoutWeekday(payment.refundedAt)}
                    </div>
                  )}
                  {activeTab === "pending" && (
                    <div className="mt-2">
                      <Badge
                        variant="warning"
                        className="text-xs bg-orange-100 text-orange-800"
                      >
                        {getElapsedTime(payment.createdAt)}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
