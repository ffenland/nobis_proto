"use server";

import prisma from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";

export type IMembershipProduct = IMembershipProducts[number];

type IMembershipProducts = Prisma.PromiseReturnType<
  typeof dbMembershipProducts
>;

const dbMembershipProducts = async () => {
  const result = await prisma.membershipProduct.findMany({
    select: {
      id: true,
      title: true,
      totalCount: true,
      description: true,
      openedAt: true,
      price: true,
      onSale: true,
      closedAt: true,
    },
  });

  return result;
};

const sortPT = (pTProducts: IMembershipProducts): IMembershipProducts =>
  pTProducts.sort((a, b) => {
    if (a.onSale !== b.onSale) {
      return b.onSale ? 1 : -1; // true가 먼저 오도록 역순 정렬
    }
    return a.price - b.price;
  });

export const getMembershipProducts = async () => {
  const dbData = await dbMembershipProducts();
  return sortPT(dbData);
};
