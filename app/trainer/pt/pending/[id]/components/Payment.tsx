"use client";

import { toCurrencyString } from "@/app/lib/utils/format.utils";
import { GetPendingPtDetailResult } from "@/app/services/trainer/pt.service";
import { useEffect, useRef, useState } from "react";
import useSWRMutation from "swr/mutation";

type PaymentData = NonNullable<GetPendingPtDetailResult["payment"]>;

interface PaymentProps {
  ptId: string;
  price: number; // ptProduct의 기본 가격
  initialPayment?: PaymentData | null; // 기존 결제 정보
  onNext: () => void; // 다음 스텝으로 이동
  onBack: () => void; // 이전 스텝으로 이동
}

type PaymentMethod = "CARD" | "TRANSFER" | "CASH";

// API 호출 fetcher
const createPaymentFetcher = async (
  url: string,
  {
    arg,
  }: {
    arg: {
      method: PaymentMethod;
      amount: number;
      discount: number;
      state: "COMPLETED" | "PENDING";
      paidAt?: string;
      notes: string;
    };
  }
) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "결제 정보 생성에 실패했습니다");
  }

  return response.json();
};

export default function Payment({
  ptId,
  price,
  initialPayment,
  onNext,
  onBack,
}: PaymentProps) {
  const [method, setMethod] = useState<PaymentMethod>("CARD");
  const [discountInput, setDiscountInput] = useState("");
  const [discount, setDiscount] = useState(0);
  const [isDiscountApplied, setIsDiscountApplied] = useState(false);
  const [notes, setNotes] = useState("");

  // 초기 데이터 저장용 ref
  const initialDataRef = useRef<{
    method: PaymentMethod;
    discount: number;
    notes: string;
  } | null>(null);

  // 초기 데이터 설정
  useEffect(() => {
    if (initialPayment) {
      // method가 null이 아니고 유효한 PaymentMethod인 경우만 설정
      if (
        initialPayment.method &&
        ["CARD", "TRANSFER", "CASH"].includes(initialPayment.method)
      ) {
        const paymentMethod = initialPayment.method as PaymentMethod;
        setMethod(paymentMethod);
      }

      setNotes(initialPayment.notes || "");

      if (initialPayment.discount > 0) {
        setDiscount(initialPayment.discount);
        setDiscountInput(toCurrencyString(initialPayment.discount));
        setIsDiscountApplied(true);
      }

      // 초기 데이터 저장
      if (
        initialPayment.method &&
        ["CARD", "TRANSFER", "CASH"].includes(initialPayment.method)
      ) {
        initialDataRef.current = {
          method: initialPayment.method as PaymentMethod,
          discount: initialPayment.discount,
          notes: initialPayment.notes || "",
        };
      }
    }
  }, [initialPayment]);

  // 데이터 변경 여부 확인
  const hasDataChanged = () => {
    if (!initialPayment) return true; // 초기 데이터가 없으면 항상 새로 생성
    if (!initialDataRef.current) return true;

    return (
      method !== initialDataRef.current.method ||
      discount !== initialDataRef.current.discount ||
      notes !== initialDataRef.current.notes
    );
  };

  // 결제 금액 계산
  const finalAmount = price - discount;

  // API mutation - create/update 결정
  const { trigger: createPayment, isMutating: isCreating } = useSWRMutation(
    `/api/trainer/pt/pending/${ptId}/payment`,
    createPaymentFetcher
  );

  const { trigger: updatePayment, isMutating: isUpdating } = useSWRMutation(
    `/api/trainer/pt/pending/${ptId}/payment`,
    async (
      url: string,
      {
        arg,
      }: {
        arg: {
          paymentId: string;
          method: PaymentMethod;
          amount: number;
          discount: number;
          state: "COMPLETED" | "PENDING";
          paidAt?: string;
          notes: string;
        };
      }
    ) => {
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(arg),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "결제 정보 수정에 실패했습니다");
      }

      return response.json();
    }
  );

  const isMutating = isCreating || isUpdating;

  // 할인 입력 핸들러 - 숫자만 허용
  const handleDiscountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 숫자만 허용
    const numericValue = value.replace(/[^0-9]/g, "");
    setDiscountInput(numericValue);
  };

  // 할인 적용
  const applyDiscount = () => {
    const discountValue = parseInt(discountInput) || 0;
    // 할인 금액이 원 가격보다 크면 원 가격으로 제한
    const validDiscount = Math.min(discountValue, price);
    setDiscount(validDiscount);
    setDiscountInput(toCurrencyString(validDiscount));
    setIsDiscountApplied(true);
  };

  // 결제 완료 처리
  const handlePaymentComplete = async () => {
    try {
      // 데이터 변경 여부에 따라 처리 분기
      if (!hasDataChanged()) {
        // 데이터가 변경되지 않았으면 바로 다음 단계로
        onNext();
        return;
      }

      if (initialPayment) {
        // 기존 데이터가 있으면 업데이트
        await updatePayment({
          paymentId: initialPayment.id,
          method,
          amount: finalAmount,
          discount,
          state: "COMPLETED" as const,
          paidAt: new Date().toISOString(),
          notes,
        });
        alert("결제 정보가 수정되었습니다.");
      } else {
        // 기존 데이터가 없으면 생성
        await createPayment({
          method,
          amount: finalAmount,
          discount,
          state: "COMPLETED" as const,
          paidAt: new Date().toISOString(),
          notes,
        });
        alert("결제 정보가 저장되었습니다.");
      }

      onNext(); // 다음 단계로
    } catch (error) {
      console.error("결제 정보 처리 실패:", error);
      alert(
        initialPayment
          ? "결제 정보 수정에 실패했습니다."
          : "결제 정보 생성에 실패했습니다."
      );
    }
  };

  // 나중에 결제 처리
  const handlePaymentLater = async () => {
    try {
      // 데이터 변경 여부에 따라 처리 분기
      if (!hasDataChanged()) {
        // 데이터가 변경되지 않았으면 바로 다음 단계로
        onNext();
        return;
      }

      if (initialPayment) {
        // 기존 데이터가 있으면 업데이트
        await updatePayment({
          paymentId: initialPayment.id,
          method,
          amount: finalAmount,
          discount,
          state: "PENDING" as const,
          notes,
        });
        alert("결제 정보가 수정되었습니다. (결제 대기)");
      } else {
        // 기존 데이터가 없으면 생성
        await createPayment({
          method,
          amount: finalAmount,
          discount,
          state: "PENDING" as const,
          notes,
        });
        alert("결제 정보가 저장되었습니다. (결제 대기)");
      }

      onNext(); // 다음 단계로
    } catch (error) {
      console.error("결제 정보 처리 실패:", error);
      alert(
        initialPayment
          ? "결제 정보 수정에 실패했습니다."
          : "결제 정보 생성에 실패했습니다."
      );
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">결제 정보</h2>

      {/* 결제 방법 선택 */}
      <div>
        <label className="label">
          <span className="label-text">결제 방법</span>
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            className={`btn ${
              method === "CARD" ? "btn-primary" : "btn-outline"
            }`}
            onClick={() => setMethod("CARD")}
          >
            카드
          </button>
          <button
            type="button"
            className={`btn ${
              method === "TRANSFER" ? "btn-primary" : "btn-outline"
            }`}
            onClick={() => setMethod("TRANSFER")}
          >
            계좌이체
          </button>
          <button
            type="button"
            className={`btn ${
              method === "CASH" ? "btn-primary" : "btn-outline"
            }`}
            onClick={() => setMethod("CASH")}
          >
            현금
          </button>
        </div>
      </div>

      {/* 기본 가격 표시 */}
      <div>
        <label className="label">
          <span className="label-text">기본 가격</span>
        </label>
        <div className="text-2xl font-bold">{toCurrencyString(price)}</div>
      </div>

      {/* 할인 금액 입력 */}
      <div>
        <label className="label">
          <span className="label-text">할인 금액</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="input input-bordered flex-1"
            value={discountInput}
            onChange={handleDiscountInput}
            disabled={isDiscountApplied}
            placeholder="할인 금액을 입력하세요"
          />
          {isDiscountApplied ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setDiscount(0);
                setDiscountInput("");
                setIsDiscountApplied(false);
              }}
              disabled={!isDiscountApplied}
            >
              할인 취소
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={applyDiscount}
              disabled={isDiscountApplied || !discountInput}
            >
              할인 적용
            </button>
          )}
        </div>
        {isDiscountApplied && discount > 0 && (
          <div className="text-sm text-success mt-2">
            할인 적용: -{toCurrencyString(discount)}
          </div>
        )}
      </div>

      {/* 결제 금액 표시 */}
      <div className="divider"></div>
      <div>
        <label className="label">
          <span className="label-text text-lg font-semibold">
            최종 결제 금액
          </span>
        </label>
        <div className="text-3xl font-bold text-primary">
          {toCurrencyString(finalAmount)}
        </div>
      </div>

      {/* 메모 입력 */}
      <div>
        <label className="label">
          <span className="label-text">메모 (선택사항)</span>
        </label>
        <textarea
          className="textarea textarea-bordered w-full"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="필요한 메모를 입력하세요"
        />
      </div>

      {/* 액션 버튼들 */}
      <div className="flex justify-between">
        <button
          type="button"
          className="btn btn-outline"
          onClick={onBack}
          disabled={isMutating}
        >
          이전 단계
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePaymentComplete}
            disabled={isMutating}
          >
            {isMutating ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              "결제 완료"
            )}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handlePaymentLater}
            disabled={isMutating}
          >
            {isMutating ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              "나중에 결제"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
