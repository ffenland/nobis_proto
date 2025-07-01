"use server";
import prisma from "@/app/lib/prisma";
import { PtState } from "@prisma/client";
import { cache } from "react";

// PT 상품 상세 조회
export const getPtProductDetailService = cache(async (productId: string) => {
  const product = await prisma.ptProduct.findUnique({
    where: {
      id: productId,
    },
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      totalCount: true,
      time: true,
      onSale: true,
      createdAt: true,
      updatedAt: true,
      openedAt: true,
      closedAt: true,
      trainer: {
        select: {
          id: true,
          introduce: true,
          user: {
            select: {
              username: true,
            },
          },
        },
      },
      pt: {
        select: {
          id: true,
          state: true,
          trainerConfirmed: true,
          ptRecord: {
            select: {
              id: true,
              items: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!product) {
    return null;
  }

  // 통계 계산
  const totalPt = product.pt.length;
  const pendingPt = product.pt.filter(
    (pt) => pt.state === PtState.PENDING
  ).length;
  const confirmedPt = product.pt.filter(
    (pt) => pt.state === PtState.CONFIRMED && pt.trainerConfirmed
  ).length;

  // 완료된 PT 계산 (모든 레코드에 아이템이 있는 경우)
  const completedPt = product.pt.filter((pt) => {
    if (pt.state !== PtState.CONFIRMED || !pt.trainerConfirmed) return false;

    // 총 수업 횟수만큼 완료된 레코드가 있는지 확인
    const completedRecords = pt.ptRecord.filter(
      (record) => record.items.length > 0
    ).length;

    return completedRecords >= product.totalCount;
  }).length;

  return {
    id: product.id,
    title: product.title,
    description: product.description,
    price: product.price,
    totalCount: product.totalCount,
    time: product.time,
    onSale: product.onSale,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    openedAt: product.openedAt,
    closedAt: product.closedAt,
    trainers: product.trainer.map((trainer) => ({
      id: trainer.id,
      username: trainer.user.username,
      introduce: trainer.introduce,
    })),
    stats: {
      totalPt,
      pendingPt,
      confirmedPt,
      completedPt,
    },
  };
});

// 타입 추론
export type IPtProductDetail = Awaited<
  ReturnType<typeof getPtProductDetailService>
>;
