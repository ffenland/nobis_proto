"use server";

import { getDiscountPrice } from "@/app/lib/coupon";
import prisma from "@/app/lib/prisma";
import { getSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

export type IMembershipProductResult = Prisma.PromiseReturnType<
  typeof getMembershipProduct
>;

export const getMembershipProduct = async (id: string) => {
  const membershipProduct = await prisma.membershipProduct.findUnique({
    where: { id },
    select: {
      title: true,
      price: true,
      totalCount: true,
      description: true,
      closedAt: true,
      openedAt: true,
      onSale: true,
    },
  });
  return membershipProduct;
};

/**
 *
 * @param 멤버쉽상품Id, 쿠폰Id?
 * @returns 멤버쉽결제Id
 */
export const makePendingMembership = async ({
  membershipId,
  couponId,
}: {
  membershipId: string;
  couponId?: string; // 선택적 속성으로 정의
}) => {
  try {
    const session = await getSession();
    if (!session) {
      redirect("/login");
    }
    let coupon: { id: string; maxPrice: number; discount: number } | null =
      null;

    if (couponId) {
      const dbCoupon = await prisma.membershipCoupon.findUnique({
        where: { id: couponId },
        select: {
          member: { select: { userId: true } },
          maxPrice: true,
          discount: true,
        },
      });

      if (!dbCoupon) {
        return {
          ok: false,
          error: {
            message: "Wrong coupon.",
          },
        };
      }
      if (dbCoupon.member.userId !== session.id) {
        return {
          ok: false,
          error: {
            message: "Not your coupon",
          },
        };
      }
      coupon = {
        id: couponId,
        maxPrice: dbCoupon.maxPrice,
        discount: dbCoupon.discount,
      };
    }

    const membershipProduct = await prisma.membershipProduct.findUnique({
      where: { id: membershipId },
      select: {
        totalCount: true,
        closedAt: true,
        openedAt: true,
        onSale: true,
        price: true,
      },
    });

    if (!membershipProduct) {
      return {
        ok: false,
        error: {
          message: "That membership is no longer available",
        },
      };
    }

    const finalPrice = !coupon
      ? membershipProduct.price
      : membershipProduct.price -
        getDiscountPrice({
          discount: coupon.discount,
          maxPrice: coupon.maxPrice,
          productPrice: membershipProduct.price,
        });

    const membershipPaymentResult = await prisma.$transaction(
      async (trPrisma) => {
        const newMembership = await trPrisma.membership.create({
          data: {
            member: { connect: { userId: session.id } },
            membershipProduct: { connect: { id: membershipId } },
            totalDays: membershipProduct.totalCount,
            activeDays: membershipProduct.totalCount,
            ...(couponId && {
              membershipCoupon: { connect: { id: couponId } },
            }),
          },
          select: { id: true },
        });
        const newMSPayment = await trPrisma.membershipPayment.create({
          data: {
            membership: { connect: { id: newMembership.id } },
            price: finalPrice,
          },
          select: { id: true },
        });
        return { paymentId: newMSPayment.id };
      }
    );

    return { ok: true, paymentId: membershipPaymentResult.paymentId };
  } catch (error) {
    console.error("Error creating membership:", error);
    return {
      ok: false,
      error: {
        message: "An unexpected error occurred.",
      },
    };
  }
};
