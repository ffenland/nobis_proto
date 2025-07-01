"use server";

import prisma from "@/app/lib/prisma";
import { cache } from "react";

// 멤버십 전체 현황 조회
export const getMembershipsOverviewService = cache(async () => {
  const memberships = await prisma.membership.findMany({
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      startedAt: true,
      closedAt: true,
      paid: true,
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
      membershipProduct: {
        select: {
          id: true,
          title: true,
          price: true,
          totalCount: true,
        },
      },
      membershipPayment: {
        select: {
          id: true,
          paidAt: true,
          price: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // 통계 계산
  const totalMemberships = memberships.length;
  const activeMemberships = memberships.filter((m) => m.isActive).length;

  // 30일 이내 만료 예정 (활성 상태 중에서)
  const expiringMemberships = memberships.filter(
    (m) =>
      m.isActive &&
      m.closedAt &&
      m.closedAt <= thirtyDaysFromNow &&
      m.closedAt > now
  ).length;

  // 만료되었거나 미시작인 멤버십
  const expiredMemberships = memberships.filter((m) => !m.isActive).length;

  // 멤버십 목록 데이터 변환
  const membershipList = memberships.map((membership) => ({
    id: membership.id,
    memberName: membership.member.user.username,
    productTitle: membership.membershipProduct.title,
    price: membership.membershipProduct.price,
    totalDays: membership.totalDays,
    createdAt: membership.createdAt,
    startedAt: membership.startedAt,
    closedAt: membership.closedAt,
    paid: membership.paid,
    isActive: membership.isActive,
  }));

  return {
    memberships: membershipList,
    stats: {
      totalMemberships,
      activeMemberships,
      expiringMemberships,
      expiredMemberships,
    },
  };
});

// 특정 멤버십 상세 조회
export const getMembershipDetailService = cache(
  async (membershipId: string) => {
    const membership = await prisma.membership.findUnique({
      where: {
        id: membershipId,
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        startedAt: true,
        closedAt: true,
        paid: true,
        isActive: true,
        totalDays: true,
        member: {
          select: {
            id: true,
            user: {
              select: {
                username: true,
                email: true,
              },
            },
          },
        },
        membershipProduct: {
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            totalCount: true,
          },
        },
        membershipPayment: {
          select: {
            id: true,
            createdAt: true,
            paidAt: true,
            price: true,
            nictTid: true,
          },
        },
        membershipAddedDay: {
          select: {
            id: true,
            createdAt: true,
            dayCount: true,
            description: true,
            issuer: {
              select: {
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

    if (!membership) {
      return null;
    }

    return {
      id: membership.id,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
      startedAt: membership.startedAt,
      closedAt: membership.closedAt,
      paid: membership.paid,
      isActive: membership.isActive,
      totalDays: membership.totalDays,
      member: {
        id: membership.member.id,
        username: membership.member.user.username,
        email: membership.member.user.email,
      },
      product: {
        id: membership.membershipProduct.id,
        title: membership.membershipProduct.title,
        description: membership.membershipProduct.description,
        price: membership.membershipProduct.price,
        totalCount: membership.membershipProduct.totalCount,
      },
      payment: membership.membershipPayment
        ? {
            id: membership.membershipPayment.id,
            createdAt: membership.membershipPayment.createdAt,
            paidAt: membership.membershipPayment.paidAt,
            price: membership.membershipPayment.price,
            nictTid: membership.membershipPayment.nictTid,
          }
        : null,
      addedDays: membership.membershipAddedDay.map((addedDay) => ({
        id: addedDay.id,
        createdAt: addedDay.createdAt,
        dayCount: addedDay.dayCount,
        description: addedDay.description,
        issuerName: addedDay.issuer.user.username,
      })),
    };
  }
);

// 멤버십 활성화
export const activateMembershipService = async (membershipId: string) => {
  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: {
      id: true,
      isActive: true,
      startedAt: true,
      totalDays: true,
    },
  });

  if (!membership) {
    throw new Error("멤버십을 찾을 수 없습니다.");
  }

  if (membership.isActive) {
    throw new Error("이미 활성화된 멤버십입니다.");
  }

  const now = new Date();
  const closedAt = new Date(
    now.getTime() + membership.totalDays * 24 * 60 * 60 * 1000
  );

  const updatedMembership = await prisma.membership.update({
    where: { id: membershipId },
    data: {
      isActive: true,
      startedAt: now,
      closedAt: closedAt,
    },
    select: {
      id: true,
      isActive: true,
      startedAt: true,
      closedAt: true,
    },
  });

  return updatedMembership;
};

// 멤버십 연장
export const extendMembershipService = async (
  membershipId: string,
  additionalDays: number,
  managerId: string,
  description?: string
) => {
  return await prisma.$transaction(async (tx) => {
    const membership = await tx.membership.findUnique({
      where: { id: membershipId },
      select: {
        id: true,
        isActive: true,
        closedAt: true,
        totalDays: true,
      },
    });

    if (!membership) {
      throw new Error("멤버십을 찾을 수 없습니다.");
    }

    // 새로운 종료일 계산
    const currentClosedAt = membership.closedAt || new Date();
    const newClosedAt = new Date(
      currentClosedAt.getTime() + additionalDays * 24 * 60 * 60 * 1000
    );

    // 멤버십 업데이트
    const updatedMembership = await tx.membership.update({
      where: { id: membershipId },
      data: {
        closedAt: newClosedAt,
        totalDays: membership.totalDays + additionalDays,
      },
      select: {
        id: true,
        closedAt: true,
        totalDays: true,
      },
    });

    // 연장 기록 추가
    await tx.membershipAddedDay.create({
      data: {
        membershipId: membershipId,
        issuerId: managerId,
        dayCount: additionalDays,
        description: description || `${additionalDays}일 연장`,
      },
    });

    return updatedMembership;
  });
};

// 타입 추론
export type IMembershipsOverview = Awaited<
  ReturnType<typeof getMembershipsOverviewService>
>;

export type IMembershipDetail = Awaited<
  ReturnType<typeof getMembershipDetailService>
>;

export type IMembershipActivation = Awaited<
  ReturnType<typeof activateMembershipService>
>;

export type IMembershipExtension = Awaited<
  ReturnType<typeof extendMembershipService>
>;
