import prisma from "@/app/lib/prisma";
import { cache } from "react";

// 멤버십 상품 상세 조회
export const getMembershipProductDetailService = cache(
  async (productId: string) => {
    const product = await prisma.membershipProduct.findUnique({
      where: {
        id: productId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        totalCount: true,
        onSale: true,
        createdAt: true,
        updatedAt: true,
        openedAt: true,
        closedAt: true,
        membership: {
          select: {
            id: true,
            createdAt: true,
            startedAt: true,
            closedAt: true,
            isActive: true,
            totalDays: true,
            member: {
              select: {
                id: true,
                user: {
                  select: {
                    username: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!product) {
      return null;
    }

    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 통계 계산
    const totalMemberships = product.membership.length;
    const activeMemberships = product.membership.filter(
      (m) => m.isActive
    ).length;
    const expiredMemberships = product.membership.filter(
      (m) => !m.isActive && m.startedAt && m.closedAt && m.closedAt < now
    ).length;
    const pendingMemberships = product.membership.filter(
      (m) => !m.isActive && !m.startedAt
    ).length;

    // 이번 달 가입자 수
    const thisMonthMemberships = product.membership.filter(
      (m) => m.createdAt >= currentMonth
    ).length;

    // 평균 월 매출 계산 (생성 후 경과 월 기준)
    const monthsSinceCreation = Math.max(
      1,
      Math.ceil(
        (now.getTime() - product.createdAt.getTime()) /
          (1000 * 60 * 60 * 24 * 30)
      )
    );
    const averageMonthlyRevenue =
      (totalMemberships * product.price) / monthsSinceCreation;

    // 최근 가입자 10명 (상세 정보 포함)
    const recentMemberships = product.membership
      .slice(0, 10)
      .map((membership) => {
        const remainingDays =
          membership.isActive && membership.closedAt
            ? Math.max(
                0,
                Math.ceil(
                  (membership.closedAt.getTime() - now.getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              )
            : 0;

        return {
          id: membership.id,
          memberName: membership.member.user.username,
          createdAt: membership.createdAt,
          startedAt: membership.startedAt,
          closedAt: membership.closedAt,
          isActive: membership.isActive,
          remainingDays,
        };
      });

    return {
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price,
      totalCount: product.totalCount,
      onSale: product.onSale,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      openedAt: product.openedAt,
      closedAt: product.closedAt,
      stats: {
        totalMemberships,
        activeMemberships,
        expiredMemberships,
        pendingMemberships,
        thisMonthMemberships,
        averageMonthlyRevenue: Math.round(averageMonthlyRevenue),
      },
      recentMemberships,
    };
  }
);

// 타입 추론
export type IMembershipProductDetail = Awaited<
  ReturnType<typeof getMembershipProductDetailService>
>;
