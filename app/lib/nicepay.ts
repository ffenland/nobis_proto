import { nicePaymentsErros } from "./errors/nicepaymentError";
import prisma from "./prisma";

export const membershipPaidProcess = async ({
  orderId,
  niceTid,
  price,
}: {
  orderId: string;
  niceTid: string;
  price: number;
}) => {
  try {
    const pendingMembershipPayment = await prisma.membershipPayment.findUnique({
      where: { id: orderId },
      select: {
        price: true,
        membershipId: true,
      },
    });
    if (!pendingMembershipPayment) {
      return {
        ok: false,
        error: nicePaymentsErros.N0001,
      };
    }
    if (pendingMembershipPayment.price !== price) {
      return {
        ok: false,
        error: {
          message:
            "결제가격과 제품가격이 다릅니다. 결제 취소를 요청해야합니다.",
        },
      };
    }
    const result = await prisma.$transaction(async (trPrisma) => {
      const updated = await trPrisma.membershipPayment.update({
        where: { id: orderId },
        data: { nictTid: niceTid, paidAt: new Date() },
        include: { membership: { select: { id: true } } },
      });

      if (!updated || !updated.membership) {
        return { ok: false, error: nicePaymentsErros.N0001 };
      }

      const updatedMembership = await trPrisma.membership.update({
        where: { id: updated.membership.id },
        data: { paid: true },
      });

      return { ok: true, updatedMembership };
    });
    if (result.ok && result.updatedMembership) {
      return { ok: true, membershipId: result.updatedMembership.id };
    } else {
      return { ok: false, error: result.error };
    }
  } catch (error) {
    console.error("Error in membershipPaidProcess:", error);
    return {
      ok: false,
      error: {
        message: "결제 데이터를 작성하는데 실패했습니다.",
        error: error,
      },
    };
  }
};

export const cancelPayment = async ({ tid }: { tid: string }) => {};

export const errorHandling = async (errorCode: string) => {};

export const checkMembershipPriceMatch = async ({
  paymentId,
  price,
}: {
  paymentId: string;
  price: string;
}) => {
  const payment = await prisma.membershipPayment.findUnique({
    where: {
      id: paymentId,
    },
    select: {
      price: true,
    },
  });
  if (payment && payment.price === parseInt(price)) {
    return true;
  } else {
    return false;
  }
};
