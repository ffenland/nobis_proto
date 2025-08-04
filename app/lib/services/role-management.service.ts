import prisma from "@/app/lib/prisma";
import { UserRole } from "@prisma/client";

export interface UserSearchResult {
  id: string;
  username: string;
  email: string;
  mobile: string;
  role: UserRole;
  createdAt: Date;
  memberProfile?: { id: string } | null;
  trainerProfile?: { id: string; fitnessCenterId: string | null } | null;
  managerProfile?: { id: string; fitnessCenterId: string | null } | null;
}

export interface RoleChangeResult {
  success: boolean;
  message: string;
  newRole?: UserRole;
}

// 비밀번호 검증
export async function verifyRoleManagementPassword(
  password: string
): Promise<boolean> {
  return password === process.env.ROLE_MANAGEMENT_PASSWORD;
}

// username으로 사용자 검색
export async function searchUserByUsername(username: string) {
  const whereCondition: any = {
    deletedAt: null,
  };

  // username이 비어있지 않으면 검색 조건 추가
  if (username) {
    whereCondition.username = {
      contains: username,
      mode: "insensitive",
    };
  }

  const users = await prisma.user.findMany({
    where: whereCondition,
    select: {
      id: true,
      username: true,
      email: true,
      mobile: true,
      role: true,
      createdAt: true,
      memberProfile: {
        select: { id: true },
      },
      trainerProfile: {
        select: {
          id: true,
          fitnessCenterId: true,
        },
      },
      managerProfile: {
        select: {
          id: true,
          fitnessCenterId: true,
        },
      },
    },
    orderBy: {
      username: "asc",
    },
  });

  return users;
}

export type SearchUserByUsernameResult = Awaited<
  ReturnType<typeof searchUserByUsername>
>;

// 역할 변경 처리
export async function changeUserRole(
  userId: string,
  newRole: UserRole,
  managerId: string, // 변경을 수행하는 매니저 ID
  fitnessCenterId?: string // TRAINER나 MANAGER로 변경 시 필요
): Promise<RoleChangeResult> {
  try {
    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberProfile: true,
        trainerProfile: true,
        managerProfile: true,
      },
    });

    if (!user) {
      return { success: false, message: "사용자를 찾을 수 없습니다." };
    }

    // 이미 같은 역할인 경우
    if (user.role === newRole) {
      return { success: false, message: "이미 해당 역할을 가지고 있습니다." };
    }

    // 트랜잭션으로 역할 변경 처리
    await prisma.$transaction(async (tx) => {
      // 1. 기존 프로필 삭제
      if (user.memberProfile) {
        await tx.member.delete({
          where: { id: user.memberProfile.id },
        });
      }
      if (user.trainerProfile) {
        await tx.trainer.delete({
          where: { id: user.trainerProfile.id },
        });
      }
      if (user.managerProfile) {
        await tx.manager.delete({
          where: { id: user.managerProfile.id },
        });
      }

      // 2. 새로운 프로필 생성
      if (newRole === UserRole.TRAINER) {
        await tx.trainer.create({
          data: {
            userId,
            fitnessCenterId,
          },
        });
      } else if (newRole === UserRole.MANAGER) {
        await tx.manager.create({
          data: {
            userId,
            fitnessCenterId,
          },
        });
      } else if (newRole === UserRole.MEMBER) {
        await tx.member.create({
          data: {
            userId,
          },
        });
      }

      // 3. User의 role 필드 업데이트
      await tx.user.update({
        where: { id: userId },
        data: { role: newRole },
      });
    });

    return {
      success: true,
      message: `역할이 ${newRole}로 변경되었습니다.`,
      newRole,
    };
  } catch (error) {
    console.error("Role change error:", error);
    return {
      success: false,
      message: "역할 변경 중 오류가 발생했습니다.",
    };
  }
}

// 역할 변경 가능 여부 확인
export async function canChangeRole(
  userId: string
): Promise<{ canChange: boolean; reason?: string }> {
  // PT 세션이 진행 중인지 확인
  const activePts = await prisma.pt.count({
    where: {
      OR: [{ memberId: userId }, { trainerId: userId }],
      state: {
        in: ["PENDING", "CONFIRMED"],
      },
    },
  });

  if (activePts > 0) {
    return {
      canChange: false,
      reason: "진행 중인 PT 세션이 있어 역할을 변경할 수 없습니다.",
    };
  }

  return { canChange: true };
}
