"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { GetPtPaymentForEditResult } from "@/app/services/trainer/pt.service";
import { toCurrencyString } from "@/app/lib/utils/format.utils";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { ko } from "date-fns/locale";

interface PaymentEditCardProps {
  ptId: string;
}

type PaymentMethod = "CARD" | "TRANSFER" | "CASH";

export default function PaymentEditCard({ ptId }: PaymentEditCardProps) {
  const {
    data: payment,
    error,
    isLoading,
  } = useSWR<GetPtPaymentForEditResult>(`/api/trainer/pt/${ptId}/payment`);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    discount: 0,
    deduction: "",
    method: "CARD" as PaymentMethod,
    paidAt: "",
    refundedAt: "",
    notes: "",
    reason: "",
  });

  // 날짜 선택을 위한 별도 state
  const [selectedPaidDate, setSelectedPaidDate] = useState<Date | undefined>();
  const [selectedRefundDate, setSelectedRefundDate] = useState<
    Date | undefined
  >();

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading)
    return <div className="card bg-base-100 shadow-md p-4">로딩 중...</div>;
  if (error || !payment)
    return (
      <div className="card bg-base-100 shadow-md p-4">
        결제 정보를 불러올 수 없습니다.
      </div>
    );
  const defaultClassNames = getDefaultClassNames();
  const basePrice = payment.pt.ptProduct.price;
  const currentDiscount = isEditing ? formData.discount : payment.discount;
  const finalAmount = basePrice - currentDiscount;

  // 현재 상태에 따른 시나리오 결정
  const currentState = payment.state;
  const deductionValue =
    formData.deduction !== "" ? parseInt(formData.deduction) || 0 : null;
  const isRefundScenario =
    currentState === "COMPLETED" && deductionValue !== null;

  // 버튼 텍스트 결정
  const getButtonText = () => {
    if (currentState === "PENDING") return "결제완료";
    if (isRefundScenario) return "환불진행";
    return "할인변경";
  };

  const handleEdit = () => {
    setFormData({
      discount: payment.discount,
      deduction: "",
      method: payment.method as PaymentMethod,
      paidAt: payment.paidAt
        ? new Date(payment.paidAt).toISOString().slice(0, 16)
        : "",
      refundedAt: payment.refundedAt
        ? new Date(payment.refundedAt).toISOString().slice(0, 10)
        : "",
      notes: payment.notes,
      reason: "",
    });

    // 날짜 state 초기화 (기본값 없음)
    setSelectedPaidDate(undefined);
    setSelectedRefundDate(
      payment.refundedAt ? new Date(payment.refundedAt) : undefined
    );

    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      discount: 0,
      deduction: "",
      method: "CARD",
      paidAt: "",
      refundedAt: "",
      notes: "",
      reason: "",
    });

    // 날짜 state 초기화
    setSelectedPaidDate(undefined);
    setSelectedRefundDate(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // PENDING -> COMPLETED는 reason 선택사항, 나머지는 필수
    const isReasonRequired = !(currentState === "PENDING" && !isRefundScenario);

    if (isReasonRequired && !formData.reason.trim()) {
      alert("변경 사유를 입력해주세요.");
      return;
    }

    // 날짜 검증
    if (currentState === "PENDING" || currentState === "COMPLETED") {
      if (isRefundScenario) {
        // 환불 시나리오에서는 환불일 검증
        if (!selectedRefundDate) {
          alert("환불일을 선택해주세요.");
          return;
        }
      } else {
        // 일반 결제 시나리오에서는 결제일 검증
        if (!selectedPaidDate) {
          alert("결제일을 선택해주세요.");
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      // reason 기본값 설정
      const defaultReason =
        currentState === "PENDING" && !isRefundScenario
          ? "정상 결제 완료"
          : formData.reason;

      let requestData: any = {
        paymentId: payment.id,
        notes: formData.notes,
        reason: defaultReason,
      };

      // 시나리오별 데이터 구성
      if (currentState === "PENDING") {
        // 시나리오 1: PENDING -> COMPLETED
        requestData = {
          ...requestData,
          discount: formData.discount,
          amount: finalAmount,
          state: "COMPLETED",
          paidAt: selectedPaidDate?.toISOString() || new Date().toISOString(),
        };
      } else if (isRefundScenario) {
        // 시나리오 3: COMPLETED -> REFUNDED
        const refundAmount = payment.amount - (deductionValue || 0);
        requestData = {
          ...requestData,
          deduction: deductionValue || 0,
          refundAmount: Math.max(0, refundAmount),
          state: "REFUNDED",
          refundedAt: selectedRefundDate
            ? new Date(
                selectedRefundDate.toDateString() + " 00:00:00"
              ).toISOString()
            : new Date().toISOString(),
        };
      } else {
        // 시나리오 2: COMPLETED 할인 변경
        requestData = {
          ...requestData,
          discount: formData.discount,
          amount: finalAmount,
          paidAt: selectedPaidDate?.toISOString(),
        };
      }

      // method 변경이 있는 경우만 추가
      if (formData.method !== payment.method) {
        requestData.method = formData.method;
      }

      const response = await fetch(`/api/trainer/pt/${ptId}/payment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "결제 정보 수정에 실패했습니다.");
      }

      // SWR 캐시 갱신
      await mutate(`/api/trainer/pt/${ptId}/payment`);
      setIsEditing(false);
      alert("결제 정보가 성공적으로 수정되었습니다.");
    } catch (error) {
      console.error("결제 정보 수정 실패:", error);
      alert((error as Error).message || "결제 정보 수정에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case "COMPLETED":
        return "badge-success";
      case "PENDING":
        return "badge-warning";
      case "FAILED":
        return "badge-error";
      case "REFUNDED":
        return "badge-neutral";
      default:
        return "badge-ghost";
    }
  };

  const getStateText = (state: string) => {
    switch (state) {
      case "COMPLETED":
        return "결제완료";
      case "PENDING":
        return "결제대기";
      case "FAILED":
        return "결제실패";
      case "REFUNDED":
        return "환불완료";
      default:
        return state;
    }
  };

  const getMethodText = (method: string) => {
    switch (method) {
      case "CARD":
        return "카드";
      case "TRANSFER":
        return "계좌이체";
      case "CASH":
        return "현금";
      default:
        return method;
    }
  };

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <h3 className="card-title">결제 정보</h3>
          {!isEditing && payment.state !== "REFUNDED" && (
            <button onClick={handleEdit} className="btn btn-outline btn-sm">
              수정
            </button>
          )}
        </div>

        {!isEditing ? (
          // 읽기 모드
          <div className="space-y-4">
            {/* 회원 정보 */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium">회원 정보</div>
              <div className="text-sm text-gray-600">
                {payment.pt.member?.user.username} |{" "}
                {payment.pt.ptProduct.title}
              </div>
            </div>

            {/* 기본 가격 */}
            <div>
              <label className="text-sm font-medium text-gray-600">
                기본 가격
              </label>
              <div className="text-xl font-bold">
                {toCurrencyString(basePrice)}원
              </div>
            </div>

            {/* 할인 금액 */}
            <div>
              <label className="text-sm font-medium text-gray-600">
                할인 금액
              </label>
              <div className="text-lg font-semibold text-orange-600">
                -{toCurrencyString(payment.discount)}원
              </div>
            </div>

            {/* 결제 금액 */}
            <div className="border-t pt-2">
              <label className="text-sm font-medium text-gray-600">
                결제 금액
              </label>
              <div className="text-2xl font-bold text-primary">
                {toCurrencyString(payment.amount)}원
              </div>
            </div>

            {/* 차감액 표시 (환불된 경우) */}
            {payment.deduction > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-600">
                  차감 금액
                </label>
                <div className="text-lg font-semibold text-red-600">
                  -{toCurrencyString(payment.deduction)}원
                </div>
              </div>
            )}

            {/* 환불 금액 표시 (환불된 경우) */}
            {payment.refundAmount !== null && (
              <div className="border-t pt-2">
                <label className="text-sm font-medium text-gray-600">
                  환불 금액
                </label>
                <div className="text-2xl font-bold text-red-600">
                  {toCurrencyString(payment.refundAmount)}원
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  결제 방법
                </label>
                <div>{getMethodText(payment.method)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">
                  결제 상태
                </label>
                <div>
                  <span className={`badge ${getStateColor(payment.state)}`}>
                    {getStateText(payment.state)}
                  </span>
                </div>
              </div>
            </div>

            {payment.paidAt && (
              <div>
                <label className="text-sm font-medium text-gray-600">
                  결제일시
                </label>
                <div>{new Date(payment.paidAt).toLocaleString()}</div>
              </div>
            )}

            {payment.refundedAt && (
              <div>
                <label className="text-sm font-medium text-gray-600">
                  환불일시
                </label>
                <div>{new Date(payment.refundedAt).toLocaleString()}</div>
              </div>
            )}

            {payment.notes && (
              <div>
                <label className="text-sm font-medium text-gray-600">
                  메모
                </label>
                <div className="text-sm">{payment.notes}</div>
              </div>
            )}
          </div>
        ) : (
          // 편집 모드
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 가격 정보 */}
            <div
              className={`p-4 rounded-lg ${
                isRefundScenario ? "bg-red-50" : "bg-blue-50"
              }`}
            >
              {isRefundScenario ? (
                // 환불 시나리오: 환불 계산 정보 표시
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-sm text-gray-600">결제 금액</div>
                    <div className="text-lg font-bold">
                      {toCurrencyString(payment.amount)}원
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">차감 금액</div>
                    <div className="text-lg font-bold text-red-600">
                      -{toCurrencyString(deductionValue || 0)}원
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">환불 금액</div>
                    <div className="text-xl font-bold text-red-700">
                      {toCurrencyString(
                        Math.max(0, payment.amount - (deductionValue || 0))
                      )}
                      원
                    </div>
                  </div>
                </div>
              ) : (
                // 일반 시나리오: 기존 가격 계산 정보 표시
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-sm text-gray-600">기본 가격</div>
                    <div className="text-lg font-bold">
                      {toCurrencyString(basePrice)}원
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">할인 금액</div>
                    <div className="text-lg font-bold text-orange-600">
                      -{toCurrencyString(currentDiscount)}원
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">최종 금액</div>
                    <div className="text-xl font-bold text-primary">
                      {toCurrencyString(finalAmount)}원
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 할인 금액 입력 */}
            <div>
              <label className="label">
                <span className="label-text font-medium">
                  할인 금액
                  {isRefundScenario && (
                    <span className="text-sm text-gray-500 ml-2">
                      (환불 모드에서는 수정 불가)
                    </span>
                  )}
                </span>
              </label>
              <input
                type="number"
                min="0"
                max={basePrice}
                value={formData.discount}
                onChange={(e) =>
                  setFormData({ ...formData, discount: Number(e.target.value) })
                }
                disabled={isRefundScenario}
                className={`input input-bordered w-full [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield] ${
                  isRefundScenario ? "bg-gray-100 cursor-not-allowed" : ""
                }`}
                placeholder="할인 금액을 입력하세요"
              />
            </div>

            {/* 차감액 입력 (COMPLETED 상태에서만) */}
            {currentState === "COMPLETED" && (
              <div>
                <label className="label">
                  <span className="label-text font-medium">
                    차감액 (환불 시)
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.deduction}
                  onChange={(e) =>
                    setFormData({ ...formData, deduction: e.target.value })
                  }
                  className="input input-bordered w-full [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                  placeholder="환불을 원하시면 차감액에 금액을 입력해주세요, 차감 금액이 없으면 0을 입력하세요"
                />
                <div className="label">
                  <span className="label-text-alt text-gray-600">
                    환불을 원하시면 차감액에 금액을 입력해주세요, 차감 금액이
                    없으면 0을 입력하세요
                  </span>
                </div>
              </div>
            )}

            {/* 결제 방법 선택 */}
            <div>
              <label className="label">
                <span className="label-text font-medium">결제 방법</span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`btn ${
                    formData.method === "CARD" ? "btn-primary" : "btn-outline"
                  }`}
                  onClick={() => setFormData({ ...formData, method: "CARD" })}
                >
                  카드
                </button>
                <button
                  type="button"
                  className={`btn ${
                    formData.method === "TRANSFER"
                      ? "btn-primary"
                      : "btn-outline"
                  }`}
                  onClick={() =>
                    setFormData({ ...formData, method: "TRANSFER" })
                  }
                >
                  계좌이체
                </button>
                <button
                  type="button"
                  className={`btn ${
                    formData.method === "CASH" ? "btn-primary" : "btn-outline"
                  }`}
                  onClick={() => setFormData({ ...formData, method: "CASH" })}
                >
                  현금
                </button>
              </div>
            </div>

            {/* 날짜 입력 - 환불 시나리오일 때는 환불일, 아니면 결제일 */}
            {(currentState === "PENDING" || currentState === "COMPLETED") && (
              <div>
                <label className="label">
                  <span className="label-text font-medium">
                    {isRefundScenario ? "환불일" : "결제일"}{" "}
                    <span className="text-red-500">*</span>
                  </span>
                </label>
                <div
                  className={`bg-white rounded-lg shadow-lg ${
                    isRefundScenario
                      ? "border-2 border-red-300"
                      : "border border-gray-300"
                  }`}
                >
                  <DayPicker
                    mode="single"
                    selected={
                      isRefundScenario ? selectedRefundDate : selectedPaidDate
                    }
                    onSelect={(date) => {
                      if (isRefundScenario) {
                        setSelectedRefundDate(date);
                      } else {
                        setSelectedPaidDate(date);
                      }
                    }}
                    locale={ko}
                    showOutsideDays={false}
                    classNames={{
                      root: `${defaultClassNames.root} w-full relative p-4`,
                      months: "w-full",
                      month: "w-full space-y-4",
                      month_caption:
                        "flex justify-center relative items-start mb-4 px-20",
                      caption_label: `md:text-lg font-semibold ${
                        isRefundScenario ? "text-red-600" : "text-gray-900"
                      }`,
                      nav: "z-10 flex justify-between w-full absolute top-0 left-0 right-0",
                      nav_button:
                        "w-1/4 py-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors flex items-center justify-center",
                      nav_button_previous: "absolute left-0 top-0",
                      nav_button_next: "absolute right-0 top-0",
                      month_grid: "w-full",
                      weekdays: "grid grid-cols-7 text-center mb-2",
                      weekday: "text-sm font-medium text-gray-600 p-2",
                      weeks: "w-full",
                      week: "grid grid-cols-7 w-full",
                      day: "relative p-0 w-full aspect-square rounded-lg flex items-center justify-center",
                      day_button: `w-full h-full rounded-lg border-2 border-transparent transition-colors flex items-center justify-center text-base font-medium cursor-pointer ${
                        isRefundScenario
                          ? "hover:bg-red-400 hover:text-white"
                          : "hover:bg-blue-400 hover:text-white"
                      }`,
                      selected: isRefundScenario
                        ? "bg-red-500 text-white hover:bg-red-600 font-semibold"
                        : "bg-blue-500 text-white hover:bg-blue-600 font-semibold",
                      today: "bg-gray-100 font-bold text-gray-900",
                      outside: "text-gray-400 opacity-50",
                      disabled:
                        "text-gray-300 opacity-50 cursor-not-allowed hover:bg-transparent",
                      hidden: "invisible",
                      chevron: `${defaultClassNames.chevron} w-7 h-7 fill-gray-600`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* 메모 입력 */}
            <div>
              <label className="label">
                <span className="label-text font-medium">메모</span>
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="textarea textarea-bordered w-full"
                rows={3}
                placeholder="필요한 메모를 입력하세요"
              />
            </div>

            {/* 변경 사유 입력 */}
            <div>
              <label className="label">
                <span className="label-text font-medium">
                  변경 사유
                  {!(currentState === "PENDING" && !isRefundScenario) && (
                    <span className="text-red-500"> *</span>
                  )}
                </span>
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                className="textarea textarea-bordered w-full"
                placeholder={
                  currentState === "PENDING" && !isRefundScenario
                    ? "변경 사유를 입력하세요 (선택사항)"
                    : "결제 정보 변경 사유를 입력해주세요"
                }
                rows={2}
                required={!(currentState === "PENDING" && !isRefundScenario)}
              />
              {currentState === "PENDING" && !isRefundScenario && (
                <div className="label">
                  <span className="label-text-alt text-gray-500">
                    정상 결제 완료는 사유 입력이 선택사항입니다
                  </span>
                </div>
              )}
            </div>

            {/* 액션 버튼 */}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="btn btn-outline"
                disabled={isSubmitting}
              >
                취소
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  getButtonText()
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
