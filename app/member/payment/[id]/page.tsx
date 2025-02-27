"use client";
import React from "react";
import Script from "next/script";
import { useEffect, useState } from "react";
import { getMSPaymentInfo } from "./actions";
import { useRouter, useParams } from "next/navigation";

const PaymentDetail = () => {
  const params = useParams();
  const paymentId = params.id as string;
  const router = useRouter();
  const [paymentInfo, setPaymentInfo] = useState<{
    title: string;
    price: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const initPaymentInfo = async (paymentId: string) => {
      const dbPaymentInfo = await getMSPaymentInfo(paymentId);

      if (dbPaymentInfo.ok && dbPaymentInfo.data) {
        setPaymentInfo({
          title: dbPaymentInfo.data.title,
          price: dbPaymentInfo.data.price,
        });
      } else {
        if (dbPaymentInfo.error?.message) {
          setErrorMessage(dbPaymentInfo.error.message);
        }
        setTimeout(() => {
          router.push(`/member/membership/`);
        }, 3000);
      }
    };

    if (paymentId) {
      initPaymentInfo(paymentId);
    }
  }, [paymentId, router]);

  const requestPayment = () => {
    if (typeof window !== "undefined" && window.AUTHNICE && paymentInfo) {
      window.AUTHNICE.requestPay({
        clientId: process.env.NEXT_PUBLIC_NICE_CLIENT_KEY!,
        method: "card",
        orderId: paymentId,
        amount: paymentInfo.price,
        goodsName: paymentInfo.title,
        returnUrl: "http://localhost:3000/member/payment/success",
        fnError: function (result) {
          alert("개발자확인용 : " + result.errorMsg);
        },
      });
    }
  };

  return (
    <>
      <div className="flex justify-center items-center h-1/3">
        <span>결제 진행중...</span>
        {errorMessage && (
          <span>
            에러가 발생했습니다. 잠시후 회원권 구매 페이지로 이동합니다.
          </span>
        )}
      </div>
      {paymentInfo && (
        <Script
          src="https://pay.nicepay.co.kr/v1/js/"
          onLoad={requestPayment}
        />
      )}
    </>
  );
};

export default PaymentDetail;
