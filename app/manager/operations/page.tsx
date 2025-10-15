"use client";

import useSWR from "swr";
import { GetUnpaidPtPaymentsResult } from "@/app/services/manager/operations.service";
import { AlertCircle, Calendar, User, CreditCard, ChevronDown, Users } from "lucide-react";
import { toCurrencyString } from "@/app/lib/utils/format.utils";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function OperationsPage() {
  const {
    data: unpaidData,
    error,
    isLoading,
  } = useSWR<GetUnpaidPtPaymentsResult>(
    "/api/manager/operation/payment",
    fetcher
  );

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    const methodMap: { [key: string]: string } = {
      CARD: "카드",
      TRANSFER: "계좌이체",
      CASH: "현금",
    };
    return methodMap[method] || method;
  };

  if (isLoading) {
    return (
      <div className="h-full min-h-screen bg-gray-50 p-4">
        <div className="flex justify-center items-center py-8">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full min-h-screen bg-gray-50 p-4">
        <div className="alert alert-error">
          <span>데이터를 불러오는 중 오류가 발생했습니다.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">운영 현황</h1>
              <p className="text-gray-600">센터 운영 관련 이슈 및 미수금을 확인합니다</p>
            </div>
            <div className="flex gap-2">
              <Link href="/manager/members" className="btn btn-primary gap-2">
                <Users className="w-4 h-4" />
                회원관리
              </Link>
            </div>
          </div>
        </div>

        {/* 통계 요약 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white shadow-lg rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">총 미수금</p>
                <p className="text-3xl font-bold text-orange-600">
                  {toCurrencyString(
                    unpaidData?.payments.reduce((sum, p) => sum + p.amount, 0) || 0
                  )}원
                </p>
              </div>
              <span className="inline-flex items-center justify-center w-8 h-8 text-xl font-bold text-orange-600 border-2 border-orange-600 rounded-full flex-shrink-0">
                ₩
              </span>
            </div>
          </div>

          <div className="bg-white shadow-lg rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">긴급 처리 필요</p>
                <p className="text-3xl font-bold text-red-600">
                  {unpaidData?.urgentCount || 0}건
                </p>
                <p className="text-xs text-gray-400 mt-1">수업 시작일 경과</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white shadow-lg rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">일반 미수금</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {(unpaidData?.totalCount || 0) - (unpaidData?.urgentCount || 0)}건
                </p>
                <p className="text-xs text-gray-400 mt-1">정상 범위</p>
              </div>
              <Calendar className="w-8 h-8 text-yellow-600 flex-shrink-0" />
            </div>
          </div>
        </div>

        {/* 미수금 내역 */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">수업료 미납 내역</h2>

            <div className="space-y-3">
              {unpaidData?.payments && unpaidData.payments.length > 0 ? (
                unpaidData.payments.map((payment) => (
                  <details
                    key={payment.id}
                    className={`border-l-4 rounded-r-lg ${
                      payment.isUrgent
                        ? "border-red-500 bg-red-50"
                        : "border-yellow-500 bg-yellow-50"
                    }`}
                  >
                    <summary className="cursor-pointer p-4 list-none">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                        <div className="flex items-center gap-3">
                          {payment.isUrgent && (
                            <span className="badge badge-error">긴급</span>
                          )}
                          <h3 className="font-bold text-lg">
                            {toCurrencyString(payment.amount)}원
                          </h3>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4 text-blue-600" />
                            <span className="font-medium">{payment.trainerName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4 text-green-600" />
                            <span className="font-medium">{payment.memberName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-purple-600" />
                            <span
                              className={`font-medium ${
                                payment.isUrgent ? "text-red-600" : ""
                              }`}
                            >
                              {formatDate(payment.startDate)}
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1 px-3 py-1 ml-2 text-sm font-medium border-2 border-gray-400 rounded-lg hover:bg-gray-100 transition-colors">
                            상세보기
                            <ChevronDown className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    </summary>

                    <div className="px-4 pb-4 pt-2 border-t border-gray-200 bg-white bg-opacity-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 트레이너 정보 */}
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-600">트레이너</p>
                            <p className="text-sm font-medium">
                              {payment.trainerName}
                            </p>
                          </div>
                        </div>

                        {/* 회원 정보 */}
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-600">회원</p>
                            <p className="text-sm font-medium">
                              {payment.memberName}
                            </p>
                          </div>
                        </div>

                        {/* 수업 시작일 */}
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-purple-600 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-600">수업 시작일</p>
                            <p
                              className={`text-sm font-medium ${
                                payment.isUrgent
                                  ? "text-red-600 font-bold"
                                  : ""
                              }`}
                            >
                              {formatDate(payment.startDate)}
                              {payment.isUrgent && " (경과)"}
                            </p>
                          </div>
                        </div>

                        {/* 결제 방법 */}
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-orange-600 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-600">결제 방법</p>
                            <p className="text-sm font-medium">
                              {getPaymentMethodLabel(payment.method)}
                            </p>
                          </div>
                        </div>

                        {/* 센터 정보 */}
                        {payment.fitnessCenterTitle && (
                          <div className="md:col-span-2">
                            <p className="text-xs text-gray-600">피트니스 센터</p>
                            <p className="text-sm font-medium">
                              {payment.fitnessCenterTitle}
                            </p>
                          </div>
                        )}

                        {/* 등록일 */}
                        <div className="md:col-span-2">
                          <p className="text-xs text-gray-600">등록일</p>
                          <p className="text-sm text-gray-500">
                            {formatDateTime(payment.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </details>
                ))
              ) : (
                <div className="text-center py-12">
                  <span className="inline-flex items-center justify-center w-16 h-16 text-4xl font-bold text-gray-300 border-4 border-gray-300 rounded-full mx-auto mb-4">
                    ₩
                  </span>
                  <h3 className="text-lg font-medium text-gray-500 mb-2">
                    미수금 내역이 없습니다
                  </h3>
                  <p className="text-gray-400">
                    모든 PT 수업료가 정상적으로 결제되었습니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
