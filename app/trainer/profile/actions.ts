// app/trainer/profile/actions.ts
"use server";

import prisma from "@/app/lib/prisma";
import { getSessionOrRedirect } from "@/app/lib/session";

// 트레이너 프로필 조회 액션
export const getTrainerProfileAction = async () => {
  const session = await getSessionOrRedirect();

  // 트레이너 권한 확인
  if (session.role !== "TRAINER") {
    throw new Error("트레이너만 접근할 수 있습니다.");
  }

  const trainer = await prisma.trainer.findUnique({
    where: {
      userId: session.id,
    },
    select: {
      id: true,
      introduce: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          avatarMedia: {
            select: {
              id: true,
              publicUrl: true,
              thumbnailUrl: true,
            },
          },
        },
      },
      fitnessCenter: {
        select: {
          id: true,
          title: true,
          address: true,
        },
      },
      ptProduct: {
        select: {
          id: true,
          title: true,
          price: true,
          description: true,
          totalCount: true,
          time: true,
          onSale: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      // PT 통계를 위한 데이터
      pt: {
        select: {
          id: true,
          state: true,
          trainerConfirmed: true,
          createdAt: true,
          member: {
            select: {
              user: {
                select: {
                  username: true,
                },
              },
            },
          },
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
        where: {
          state: "CONFIRMED",
          trainerConfirmed: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!trainer) {
    throw new Error("트레이너 정보를 찾을 수 없습니다.");
  }

  // PT 통계 계산
  const ptStats = {
    totalPt: trainer.pt.length,
    activePt: trainer.pt.filter(
      (pt) => pt.state === "CONFIRMED" && pt.trainerConfirmed
    ).length,
    completedSessions: trainer.pt.reduce((total, pt) => {
      return (
        total + pt.ptRecord.filter((record) => record.items.length > 0).length
      );
    }, 0),
    totalSessions: trainer.pt.reduce((total, pt) => {
      return total + pt.ptRecord.length;
    }, 0),
  };

  // 최근 PT 회원들
  const recentMembers = trainer.pt.slice(0, 5).map((pt) => ({
    id: pt.id,
    memberName: pt.member?.user.username || "알 수 없음",
    startedAt: pt.createdAt,
    completedSessions: pt.ptRecord.filter((record) => record.items.length > 0)
      .length,
    totalSessions: pt.ptRecord.length,
  }));

  return {
    ...trainer,
    ptStats,
    recentMembers,
  };
};

// 타입 추론을 위한 타입 정의
export type ITrainerProfile = Awaited<
  ReturnType<typeof getTrainerProfileAction>
>;
export type ITrainerPtStats = ITrainerProfile["ptStats"];
export type ITrainerRecentMember = ITrainerProfile["recentMembers"][number];
