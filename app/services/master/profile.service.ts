import prisma from "@/app/lib/prisma";

// Manager Profile 수정용
export interface UpdateManagerProfileInput {
  username?: string;
  mobile?: string;
}

// Manager Profile 조회
export async function getManagerProfile(userId: string) {
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
      managerProfile: {
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          fitnessCenter: {
            select: {
              id: true,
              title: true,
              address: true,
              description: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error("유저 정보가 존재하지 않습니다.");
  }

  if (!user.managerProfile) {
    throw new Error("매니저가 아닙니다.");
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
    managerProfile: {
      id: user.managerProfile.id,
      createdAt: user.managerProfile.createdAt,
      updatedAt: user.managerProfile.updatedAt,
      fitnessCenter: user.managerProfile.fitnessCenter,
    },
  };
}

// Manager 프로필 수정
export async function updateManagerProfile(
  userId: string,
  data: UpdateManagerProfileInput
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
export type GetManagerProfileResult = Awaited<
  ReturnType<typeof getManagerProfile>
>;
export type UpdateManagerProfileResult = Awaited<
  ReturnType<typeof updateManagerProfile>
>;