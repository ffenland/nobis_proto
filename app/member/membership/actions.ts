"use server";

import prisma from "@/app/lib/prisma";
import { getSession } from "@/app/lib/session";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

export const getMembershipProducts = async () => {
  const products = await prisma.membershipProduct.findMany({
    where: {
      onSale: true,
    },
    select: {
      title: true,
      price: true,
      totalCount: true,
      description: true,
      id: true,
    },
  });
  return products;
};

type ICoupons = Prisma.PromiseReturnType<typeof getMembershipCoupons>;
export type ICoupon = ICoupons[number];
export const getMembershipCoupons = async () => {
  const getNow = () => new Date();
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const coupons = await prisma.membershipCoupon.findMany({
    where: {
      member: {
        userId: session.id,
      },
      openedAt: { lte: getNow() },
      closedAt: { gte: getNow() },
      membership: null,
    },
    select: {
      discount: true,
      maxPrice: true,
      onValid: true,
      openedAt: true,
      closedAt: true,
      id: true,
    },
  });
  return coupons;
};
