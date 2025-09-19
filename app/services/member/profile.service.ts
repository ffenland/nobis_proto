import prisma from "@/app/lib/prisma";

// Member Profile 수정용
export interface UpdateMemberProfileInput {
  username?: string;
  mobile?: string;
}

// Member Profile 조회
export async function getMemberProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      naverId: true,
      kakaoId: true,
      mobile: true,
      usernameChangeCount: true,
      createdAt: true,
      updatedAt: true,
      avatarImage: {
        select: {
          cloudflareId: true,
        },
      },
      memberProfile: {
        select: {
          id: true,
          active: true,
          fitnessCenter: {
            select: {
              id: true,
              title: true,
              address: true,
            },
          },
          pt: {
            where: {
              state: "CONFIRMED",
            },
            select: {
              id: true,
              createdAt: true,
              startDate: true,
              expirationDate: true,
              description: true,
              goals: true,
              paymentAmount: true,
              ptProduct: {
                select: {
                  id: true,
                  title: true,
                  price: true,
                  totalCount: true,
                  time: true,
                  description: true,
                },
              },
              trainer: {
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
                  level: true,
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
                orderBy: {
                  scheduledAt: "desc",
                },
                take: 5,
              },
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error("유저 정보가 존재하지 않습니다.");
  }

  if (!user.memberProfile) {
    throw new Error("회원이 아닙니다.");
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    naverId: user.naverId,
    kakaoId: user.kakaoId,
    mobile: user.mobile,
    usernameChangeCount: user.usernameChangeCount,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    avatarImageId: user.avatarImage?.cloudflareId || null,
    memberProfile: {
      id: user.memberProfile.id,
      active: user.memberProfile.active,
      fitnessCenter: user.memberProfile.fitnessCenter,
      confirmedPts: user.memberProfile.pt.map((pt) => ({
        id: pt.id,
        createdAt: pt.createdAt,
        startDate: pt.startDate,
        expirationDate: pt.expirationDate,
        description: pt.description,
        goals: pt.goals,
        paymentAmount: pt.paymentAmount,
        ptProduct: pt.ptProduct,
        trainer: pt.trainer,
        completedLessons: pt.lessons.filter(
          (lesson) => !lesson.isCanceled && lesson.records.length > 0
        ).length,
        totalLessons: pt.ptProduct.totalCount,
        recentLesson: pt.lessons[0] || null,
      })),
    },
  };
}

// Member 프로필 수정
export async function updateMemberProfile(
  userId: string,
  data: UpdateMemberProfileInput
) {
  // 휴대전화번호 검증
  if (data.mobile && !/^[0-9]{10,11}$/.test(data.mobile)) {
    throw new Error("휴대폰 번호는 10-11자리 숫자만 입력 가능합니다.");
  }

  // username 변경 제한 확인
  if (data.username) {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        usernameChangeCount: true,
        username: true,
      },
    });

    if (!currentUser) {
      throw new Error("유저가 존재하지 않습니다.");
    }

    // 유저네임이 기존과 다른지 확인
    if (currentUser.username !== data.username) {
      if (currentUser.usernameChangeCount >= 2) {
        throw new Error("변경 제한 횟수를 초과합니다.");
      }
    }
  }

  // 업데이트 데이터 준비
  const updateData: any = {};

  if (data.username) {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, usernameChangeCount: true },
    });

    // 기존 username과 다른 경우 카운트 증가
    if (currentUser && currentUser.username !== data.username) {
      updateData.username = data.username;
      updateData.usernameChangeCount = currentUser.usernameChangeCount + 1;
    } else if (currentUser && currentUser.username === data.username) {
      // 같은 이름으로 변경하는 경우 카운트 유지
      updateData.username = data.username;
    }
  }

  if (data.mobile !== undefined) {
    updateData.mobile = data.mobile;
  }

  // 업데이트 실행
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      username: true,
      mobile: true,
      usernameChangeCount: true,
    },
  });

  return updatedUser;
}

// 타입 추론
export type GetMemberProfileResult = Awaited<
  ReturnType<typeof getMemberProfile>
>;
export type UpdateMemberProfileResult = Awaited<
  ReturnType<typeof updateMemberProfile>
>;
