"use server";

import prisma from "@/app/lib/prisma";

export const getMSPaymentInfo = async (paymentId: string) => {
  try {
    const MSPayment = await prisma.membershipPayment.findUnique({
      where: { id: paymentId },
      select: {
        price: true,
        membership: {
          select: { membershipProduct: { select: { title: true } } },
        },
      },
    });
    if (!MSPayment) {
      return { ok: false, error: { message: "No payment data exists" } };
    } else {
      return {
        ok: true,
        data: {
          title: MSPayment.membership.membershipProduct.title,
          price: MSPayment.price,
        },
      };
    }
  } catch (error) {
    return {
      ok: false,
      error: { message: "Unknown Error from Server", detail: error },
    };
  }
};
