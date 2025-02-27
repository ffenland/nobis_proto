import {
  checkMembershipPriceMatch,
  membershipPaidProcess,
} from "@/app/lib/nicepay";
import { NextRequest, NextResponse } from "next/server";

interface IPaymentApprovalResponse {
  resultCode: string;
  resultMsg: string;
  tid: string;
  cancelledTid: string | null;
  orderId: string;
  ediDate: string;
  signature: string;
  status: string;
  paidAt: string;
  failedAt: string;
  cancelledAt: string;
  payMethod: string;
  amount: number;
  balanceAmt: number;
  goodsName: string;
  mallReserved: string | null;
  useEscrow: boolean;
  currency: string;
  channel: string;
  approveNo: string;
  buyerName: string | null;
  buyerTel: string | null;
  buyerEmail: string | null;
  receiptUrl: string;
  mallUserId: string | null;
  issuedCashReceipt: boolean;
  coupon: any | null;
  card: {
    cardCode: string;
    cardName: string;
    cardNum: string;
    cardQuota: number;
    isInterestFree: boolean;
    cardType: string;
    canPartCancel: boolean;
    acquCardCode: string;
    acquCardName: string;
  };
  vbank: any | null;
  cancels: any | null;
  cashReceipts: any | null;
}

export const GET = async (request: NextRequest) => {
  const clientKey = process.env.NEXT_PUBLIC_NICE_CLIENT_KEY;
  const secretKey = process.env.NICE_SECRET_TOKEN;
  return NextResponse.json(
    {
      ok: true,
      message: "결제가 성공적으로 완료되었습니다.",
      data: clientKey,
      secretKey,
    },
    { status: 200 }
  );
};

export const POST = async (request: NextRequest) => {
  const formData = await request.formData();
  const result = {
    authResultCode: formData.get("authResultCode") as string,
    authResultMsg: formData.get("authResultMsg") as string,
    tid: formData.get("tid") as string,
    clientId: formData.get("clientId") as string,
    orderId: formData.get("orderId") as string,
    amount: formData.get("amount") as string,
    mallReserved: formData.get("mallReserved") as string,
    authToken: formData.get("authToken") as string,
    signature: formData.get("signature") as string,
  };
  const checkAmount = await checkMembershipPriceMatch({
    paymentId: result.orderId,
    price: result.amount,
  });
  if (!checkAmount) {
    // Price 정보 맞지 않음 결제 차단
    return NextResponse.redirect(
      new URL(
        `/member/payment/failure?membershipId=${result.orderId}`,
        request.url
      )
    );
  }
  if (result.authResultCode === "0000") {
    const clientKey = process.env.NEXT_PUBLIC_NICE_CLIENT_KEY;
    const secretKey = process.env.NICE_SECRET_TOKEN;

    if (!clientKey || !secretKey) {
      return NextResponse.json({ error: "Missing API keys" }, { status: 500 });
    }

    const credentials = Buffer.from(`${clientKey}:${secretKey}`).toString(
      "base64"
    );
    try {
      const approvalResponse = await fetch(
        `https://sandbox-api.nicepay.co.kr/v1/payments/${result.tid}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${credentials}`,
          },
          body: JSON.stringify({
            amount: parseInt(result.amount),
          }),
        }
      );

      const approvalResult: IPaymentApprovalResponse =
        await approvalResponse.json();
      if (approvalResponse.status !== 200) {
        throw new Error(
          `HTTP error! status: ${approvalResponse.status}, message: ${
            approvalResult.resultMsg || "Unknown error"
          }`
        );
      }
      if (approvalResult.resultCode === "0000") {
        // 결제 승인 성공
        const processResult = await membershipPaidProcess({
          orderId: approvalResult.orderId,
          niceTid: approvalResult.tid,
          price: approvalResult.amount,
        });

        if (processResult.ok && processResult.membershipId) {
          return NextResponse.redirect(
            new URL(
              `/member/profile/membership/${processResult.membershipId}?new=yes`,
              request.url
            )
          );
        } else {
          // error log작성
          // unpaid 페이지로 이동
          return NextResponse.json(
            {
              ok: false,
              message: "결제가 성공적으로 완료되었습니다.",
              data: approvalResult,
            },
            { status: 200 }
          );
        }
      } else {
        // 결제 승인 실패
        return NextResponse.json(
          {
            ok: false,
            message: "결제 승인에 실패했습니다.",
            error: approvalResult.resultMsg,
          },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("Payment approval error:", error);
      return NextResponse.json(
        {
          ok: false,
          message: "결제 처리 중 오류가 발생했습니다.",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: false }, { status: 200 });
};
