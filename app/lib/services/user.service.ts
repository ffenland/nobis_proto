// app/lib/services/user.service.ts
import prisma from "@/app/lib/prisma";

// ========== 입력 타입만 정의 ==========
export interface IUpdateProfileRequest {
  username?: string;
  avatarImageId?: string | null;
}

// ========== 서비스 구현 ==========
export class UserService {
  private static instance: UserService;

  private constructor() {}

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  async getMemberProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        naverId: true,
        kakaoId: true,
        usernameChangeCount: true,
        lastUsernameChangeAt: true,
        avatarImage: {
          select: {
            cloudflareId: true,
          },
        },
        memberProfile: {
          select: {
            membership: {
              where: { isActive: true },
              select: {
                closedAt: true,
                membershipProduct: {
                  select: { title: true },
                },
              },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
            pt: {
              where: { state: "CONFIRMED" },
              select: {
                ptProduct: {
                  select: { title: true, totalCount: true },
                },
                trainer: {
                  select: {
                    user: {
                      select: { username: true },
                    },
                  },
                },
                ptRecord: {
                  select: { id: true },
                },
              },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!user || !user.memberProfile) {
      throw new Error("회원 정보를 찾을 수 없습니다.");
    }

    // SNS 제공자 확인
    const snsProvider = user.naverId ? "naver" : user.kakaoId ? "kakao" : null;

    // 멤버십 정보 처리
    const activeMembership = user.memberProfile.membership[0];
    const membership = {
      isActive: !!activeMembership,
      daysRemaining: activeMembership
        ? this.calculateDaysRemaining(activeMembership.closedAt)
        : 0,
      expiryDate: activeMembership?.closedAt || null,
      productTitle: activeMembership?.membershipProduct?.title || null,
    };

    // PT 정보 처리
    const activePt = user.memberProfile.pt[0];
    const pt = {
      isActive: !!activePt,
      productTitle: activePt?.ptProduct?.title || null,
      totalSessions: activePt?.ptProduct?.totalCount || 0,
      remainingSessions: activePt
        ? activePt.ptProduct.totalCount - activePt.ptRecord.length
        : 0,
      trainerName: activePt?.trainer?.user?.username || null,
    };

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      avatarImage: user.avatarImage,
      snsProvider,
      usernameChangeCount: user.usernameChangeCount || 0,
      lastUsernameChangeAt: user.lastUsernameChangeAt,
      canChangeUsername: (user.usernameChangeCount || 0) < 2,
      membership,
      pt,
    };
  }

  async updateProfile(userId: string, data: IUpdateProfileRequest) {
    const updateData: {
      username?: string;
      usernameChangeCount?: { increment: number };
      lastUsernameChangeAt?: Date;
      avatarImageId?: string | null;
    } = {};

    if (data.username) {
      // username 변경 가능 여부 확인
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { usernameChangeCount: true },
      });

      if (!user) {
        throw new Error("사용자를 찾을 수 없습니다.");
      }

      if ((user.usernameChangeCount || 0) >= 2) {
        throw new Error("사용자명 변경 횟수를 초과했습니다. (최대 2회)");
      }

      // username 중복 확인
      const existingUser = await prisma.user.findFirst({
        where: {
          username: data.username,
          id: { not: userId },
        },
      });

      if (existingUser) {
        throw new Error("이미 사용 중인 사용자명입니다.");
      }

      updateData.username = data.username;
      updateData.usernameChangeCount = { increment: 1 };
      updateData.lastUsernameChangeAt = new Date();
    }

    if (data.avatarImageId !== undefined) {
      updateData.avatarImageId = data.avatarImageId;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        naverId: true,
        kakaoId: true,
        usernameChangeCount: true,
        lastUsernameChangeAt: true,
        avatarImage: {
          select: {
            id: true,
            cloudflareId: true,
            originalName: true,
            mimeType: true,
            size: true,
            type: true,
            createdAt: true,
          },
        },
      },
    });

    const snsProvider = updatedUser.naverId
      ? "naver"
      : updatedUser.kakaoId
      ? "kakao"
      : null;

    return {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
      avatarImage: updatedUser.avatarImage,
      snsProvider,
      usernameChangeCount: updatedUser.usernameChangeCount || 0,
      lastUsernameChangeAt: updatedUser.lastUsernameChangeAt,
      canChangeUsername: (updatedUser.usernameChangeCount || 0) < 2,
    };
  }

  async changeUsername(userId: string, newUsername: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { usernameChangeCount: true, username: true },
      });

      if (!user) {
        return { success: false, message: "사용자를 찾을 수 없습니다." };
      }

      const changeCount = user.usernameChangeCount || 0;
      if (changeCount >= 2) {
        return {
          success: false,
          message: "사용자명 변경 횟수를 초과했습니다. (최대 2회)",
          remainingChanges: 0,
        };
      }

      if (user.username === newUsername) {
        return { success: false, message: "현재와 동일한 사용자명입니다." };
      }

      // 중복 확인
      const existingUser = await prisma.user.findFirst({
        where: {
          username: newUsername,
          id: { not: userId },
        },
      });

      if (existingUser) {
        return { success: false, message: "이미 사용 중인 사용자명입니다." };
      }

      // 업데이트
      await prisma.user.update({
        where: { id: userId },
        data: {
          username: newUsername,
          usernameChangeCount: { increment: 1 },
          lastUsernameChangeAt: new Date(),
        },
      });

      return {
        success: true,
        message: "사용자명이 성공적으로 변경되었습니다.",
        remainingChanges: 1 - changeCount,
      };
    } catch (error) {
      console.error("Username change error:", error);
      return {
        success: false,
        message: "사용자명 변경 중 오류가 발생했습니다.",
      };
    }
  }

  private calculateDaysRemaining(expiryDate: Date | null): number {
    if (!expiryDate) return 0;

    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }

  async removeAvatar(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { avatarImageId: null },
    });
  }

  async setAvatar(userId: string, imageId: string): Promise<void> {
    // 이미지가 해당 사용자가 업로드한 것인지 확인
    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        uploadedById: userId,
        type: "PROFILE",
        deletedAt: null,
      },
    });

    if (!image) {
      throw new Error("유효하지 않은 이미지입니다.");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { avatarImageId: imageId },
    });
  }
}

// ========== 함수 반환 타입 추출 ==========
const userService = UserService.getInstance();

export type IMemberProfileData = Awaited<
  ReturnType<typeof userService.getMemberProfile>
>;
export type IUserProfileData = Awaited<
  ReturnType<typeof userService.updateProfile>
>;
export type IUsernameChangeResult = Awaited<
  ReturnType<typeof userService.changeUsername>
>;
