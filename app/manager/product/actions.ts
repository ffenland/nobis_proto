"use server";
import prisma from "@/app/lib/prisma";
import { PtState } from "@prisma/client";
import { cache } from "react";

// PT 상품 목록 조회
export const getPtProductsOverviewService = cache(async () => {
  const ptProducts = await prisma.ptProduct.findMany({
    select: {
      id: true,
      title: true,
      price: true,
      totalCount: true,
      time: true,
      onSale: true,
      createdAt: true,
      openedAt: true,
      closedAt: true,
      trainer: {
        select: {
          id: true,
        },
      },
      pt: {
        where: {
          state: {
            in: [PtState.PENDING, PtState.CONFIRMED],
          },
        },
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return ptProducts.map((product) => ({
    id: product.id,
    title: product.title,
    price: product.price,
    totalCount: product.totalCount,
    time: product.time,
    onSale: product.onSale,
    createdAt: product.createdAt,
    openedAt: product.openedAt,
    closedAt: product.closedAt,
    trainerCount: product.trainer.length,
    activePtCount: product.pt.length,
  }));
});

// 멤버십 상품 목록 조회
export const getMembershipProductsOverviewService = cache(async () => {
  const membershipProducts = await prisma.membershipProduct.findMany({
    select: {
      id: true,
      title: true,
      price: true,
      totalCount: true,
      onSale: true,
      createdAt: true,
      openedAt: true,
      closedAt: true,
      membership: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return membershipProducts.map((product) => ({
    id: product.id,
    title: product.title,
    price: product.price,
    totalCount: product.totalCount,
    onSale: product.onSale,
    createdAt: product.createdAt,
    openedAt: product.openedAt,
    closedAt: product.closedAt,
    activeMembershipCount: product.membership.length,
  }));
});

// 제품 전체 개요 조회
export const getProductsOverviewService = cache(async () => {
  const [ptProducts, membershipProducts] = await Promise.all([
    getPtProductsOverviewService(),
    getMembershipProductsOverviewService(),
  ]);

  return {
    ptProducts,
    membershipProducts,
  };
});

// 타입 추론
export type IPtProductOverview = Awaited<
  ReturnType<typeof getPtProductsOverviewService>
>[number];

export type IMembershipProductOverview = Awaited<
  ReturnType<typeof getMembershipProductsOverviewService>
>[number];

export type IProductsOverview = Awaited<
  ReturnType<typeof getProductsOverviewService>
>;
