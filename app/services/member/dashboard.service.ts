import prisma from "@/app/lib/prisma";

// ===== 입력 타입 정의 (서비스파일에서 한다) =====

// ===== 서비스 함수들 (타입 추론 활용) =====

// 멤버의 PT 정보 조회
export async function getPt(memberId: string) {
  try {
    const pt = await prisma.pt.findFirst({
      where: {
        memberId,
        state: {
          in: ["CONFIRMED", "PENDING"],
        },
      },
      select: {
        id: true,
        state: true,
        expirationDate: true,
        startDate: true,
        trainer: {
          select: {
            user: {
              select: {
                username: true,
                mobile: true,
              },
            },
          },
        },
        lessons: {
          where: {
            isCanceled: false,
            scheduledAt: {
              gt: new Date(),
            },
          },
          orderBy: {
            scheduledAt: "asc",
          },
          take: 1,
          select: {
            id: true,
            scheduledAt: true,
            fitnessCenter: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    return pt;
  } catch (error) {
    console.error("Get PT error:", error);
    throw error;
  }
}

// 타입 추론
export type GetPtResult = Awaited<ReturnType<typeof getPt>>;