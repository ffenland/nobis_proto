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
      expiration_period: true,
      incentivePercent: true,
      onSale: true,
      createdAt: true,
      updatedAt: true,
      openedAt: true,
      closedAt: true,
      trainer: {
        select: {
          id: true,
          introduce: true,
          level: true,
          working: true,
          user: {
            select: {
              username: true,
              email: true,
            },
          },
          fitnessCenter: {
            select: {
              title: true,
            },
          },
        },
      },
      pt: {
        select: {
          id: true,
          state: true,
          stateUpdatedAt: true,
          startDate: true,
          expirationDate: true,
          paymentAmount: true,
          member: {
            select: {
              user: {
                select: {
                  username: true,
                },
              },
            },
          },
          lessons: {
            select: {
              id: true,
              scheduledAt: true,
              endAt: true,
              isCanceled: true,
              records: {
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
    (pt) => pt.state === PtState.CONFIRMED
  ).length;
  const rejectedPt = product.pt.filter(
    (pt) => pt.state === PtState.REJECTED
  ).length;

  // 완료된 PT 계산 (모든 수업이 완료된 경우)
  const finishedPt = product.pt.filter(
    (pt) => pt.state === PtState.FINISHED
  ).length;

  // 진행중인 PT 중 실제 수업이 진행된 PT 계산
  const activePt = product.pt.filter((pt) => {
    if (pt.state !== PtState.CONFIRMED) return false;
    // 최소 1개 이상의 수업 기록이 있는 경우
    return pt.lessons.some((lesson) => lesson.records.length > 0);
  }).length;

  return {
    id: product.id,
    title: product.title,
    description: product.description,
    price: product.price,
    totalCount: product.totalCount,
    time: product.time,
    expiration_period: product.expiration_period,
    incentivePercent: product.incentivePercent,
    onSale: product.onSale,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    openedAt: product.openedAt,
    closedAt: product.closedAt,
    trainers: product.trainer.map((trainer) => ({
      id: trainer.id,
      username: trainer.user.username,
      email: trainer.user.email,
      introduce: trainer.introduce,
      level: trainer.level,
      working: trainer.working,
      centerName: trainer.fitnessCenter?.title || "소속 없음",
    })),
    stats: {
      totalPt,
      pendingPt,
      confirmedPt,
      rejectedPt,
      finishedPt,
      activePt,
    },
  };
});

// 타입 추론
export type IPtProductDetail = Awaited<
  ReturnType<typeof getPtProductDetailService>
>;
