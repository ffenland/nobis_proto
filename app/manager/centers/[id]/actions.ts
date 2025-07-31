// app/manager/centers/[id]/actions.ts
"use server";

import prisma from "@/app/lib/prisma";
import { Prisma } from "@prisma/client";

export type ICenterDetail = Prisma.PromiseReturnType<typeof getCenterDetail>;
export type ICenterStats = Prisma.PromiseReturnType<typeof getCenterStats>;

// 센터 상세 정보 조회
export const getCenterDetail = async (centerId: string) => {
  const center = await prisma.fitnessCenter.findUnique({
    where: {
      id: centerId,
    },
    select: {
      id: true,
      title: true,
      address: true,
      phone: true,
      description: true,
      inOperation: true,
      trainers: {
        where: { working: true },
        select: {
          id: true,
          user: {
            select: {
              username: true,
              email: true,
              avatarImage: {
                select: {
                  cloudflareId: true,
                },
              },
            },
          },
        },
      },
      openingHours: {
        select: {
          id: true,
          dayOfWeek: true,
          openTime: true,
          closeTime: true,
          isClosed: true,
        },
        orderBy: {
          dayOfWeek: "asc",
        },
      },
      members: {
        where: { active: true },
        select: {
          id: true,
          user: {
            select: {
              username: true,
              avatarImage: {
                select: {
                  cloudflareId: true,
                },
              },
            },
          },
        },
        take: 10, // 최대 10명만 조회
        orderBy: {
          createdAt: "desc",
        },
      },
      machines: {
        select: {
          id: true,
          title: true,
        },
        take: 10, // 최대 10개만 조회
        orderBy: {
          title: "asc",
        },
      },
      managers: {
        select: {
          id: true,
          user: {
            select: {
              username: true,
              email: true,
              avatarImage: {
                select: {
                  cloudflareId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return center;
};

// 센터 통계 정보 조회
export const getCenterStats = async (centerId: string) => {
  // 센터가 존재하는지 확인
  const center = await prisma.fitnessCenter.findUnique({
    where: { id: centerId },
    select: { id: true },
  });

  if (!center) {
    throw new Error("센터를 찾을 수 없습니다.");
  }

  // 병렬로 통계 조회
  const [totalMembers, totalTrainers, totalMachines, activePt] =
    await Promise.all([
      // 총 회원 수
      prisma.member.count({
        where: {
          fitnessCenterId: centerId,
          active: true,
        },
      }),

      // 총 트레이너 수
      prisma.trainer.count({
        where: {
          fitnessCenterId: centerId,
          working: true,
        },
      }),

      // 총 기구 수
      prisma.machine.count({
        where: {
          fitnessCenterId: centerId,
        },
      }),

      // 활성 PT 수
      prisma.pt.count({
        where: {
          state: "CONFIRMED",
          trainerConfirmed: true,
          trainer: {
            fitnessCenterId: centerId,
          },
        },
      }),
    ]);

  return {
    members: totalMembers,
    trainers: totalTrainers,
    machines: totalMachines,
    activePt,
  };
};
