import prisma from "@/app/lib/prisma";
import { TrainerLevel, type UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

// 타입 정의

export interface SessionResponse {
  isAuthenticated: boolean;
  user: IMe | null;
  role: UserRole | undefined;
  roleId: string | undefined;
}

// 세션 정보 조회 서비스
export async function getSessionUserInfo(sessionId: string) {
  // User 정보와 모든 프로필 조회
  const user = await prisma.user.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      username: true,
      avatarImageId: true,
      role: true,
      mobile: true,
      trainerProfile: {
        select: {
          id: true,
          introduce: true,
          level: true,
        },
      },
      managerProfile: {
        select: { id: true },
      },
      memberProfile: {
        select: { id: true },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return {
    id: user.id,
    username: user.username,
    avatarImageId: user.avatarImageId,
    hasMobile: Boolean(user.mobile),
    hasManagerProfile: !!user.managerProfile,
    hasTrainerProfile: !!user.trainerProfile,
    hasMemberProfile: !!user.memberProfile,
  };
}
export type IMe = Awaited<ReturnType<typeof getSessionUserInfo>>;

// 역할 변경 가능 여부 확인
export function canSwitchRole(
  currentRole: UserRole,
  targetRole: UserRole,
  hasTargetProfile: boolean
): boolean {
  // 같은 역할로는 변경 불가
  if (currentRole === targetRole) {
    return false;
  }

  // 타겟 프로필이 없으면 변경 불가
  if (!hasTargetProfile) {
    return false;
  }

  // Manager <-> Trainer 간 전환만 허용
  if (
    (currentRole === "MANAGER" && targetRole === "TRAINER") ||
    (currentRole === "TRAINER" && targetRole === "MANAGER")
  ) {
    return true;
  }

  // Member는 역할 전환 불가
  return false;
}

// 로그아웃 API 응답 타입
export interface LogoutResponse {
  success: boolean;
  message: string;
}

// 로그아웃 서비스 함수
export async function logoutUser(): Promise<LogoutResponse> {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "로그아웃에 실패했습니다.");
    }

    return data;
  } catch (error) {
    console.error("로그아웃 서비스 에러:", error);
    throw error;
  }
}

// 카카오 로그인 처리 타입
export interface KakaoLoginResult {
  success: boolean;
  role?: UserRole;
  error?: string;
}

interface KakaoAccessTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  refresh_token_expires_in: number;
}

// 카카오 로그인 처리 함수
export async function processKakaoLogin(
  code: string
): Promise<KakaoLoginResult> {
  try {
    // 1. 액세스 토큰 획득
    const accessTokenURL = "https://kauth.kakao.com/oauth/token";
    const accessTokenResponse = await fetch(accessTokenURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.KAKAO_REST_API_KEY!,
        client_secret: process.env.KAKAO_CLIENT_SECRET!,
        redirect_uri: process.env.KAKAO_REDIRECT_URI!,
        code,
      }).toString(),
    });

    const accessTokenData = await accessTokenResponse.json();

    if (!accessTokenData.access_token) {
      return { success: false, error: "failkakaotoken" };
    }

    // 2. 사용자 정보 획득
    const kakaoUserInfoURL = "https://kapi.kakao.com/v2/user/me";
    const userProfileResponse = await fetch(kakaoUserInfoURL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessTokenData.access_token}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    });

    const userProfile = await userProfileResponse.json();

    if (!userProfile.id) {
      return { success: false, error: "failkakao" };
    }

    const kakaoId = userProfile.id.toString();
    const email = userProfile.kakao_account?.email;

    if (!email) {
      return { success: false, error: "noemail" };
    }

    // 3. 사용자 확인 및 로그인/회원가입 처리
    const { loginToSession } = await import("@/app/lib/socialLogin");

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        role: true,
        kakaoId: true,
        managerProfile: { select: { id: true } },
        trainerProfile: { select: { id: true } },
        memberProfile: { select: { id: true } },
      },
    });

    if (user && user.kakaoId === kakaoId) {
      // 기존 카카오 회원
      if (user.role === "MANAGER" && user.managerProfile) {
        await loginToSession(user.id, user.role, user.managerProfile.id);
        return { success: true, role: user.role };
      } else if (user.role === "TRAINER" && user.trainerProfile) {
        await loginToSession(user.id, user.role, user.trainerProfile.id);
        return { success: true, role: user.role };
      } else if (user.role === "MEMBER" && user.memberProfile) {
        await loginToSession(user.id, user.role, user.memberProfile.id);
        return { success: true, role: user.role };
      } else {
        return { success: false, error: "norole" };
      }
    } else if (user && user.kakaoId !== kakaoId) {
      // 이메일은 있지만 다른 소셜 로그인 사용
      return { success: false, error: "alreadynaver" };
    } else if (user && user.kakaoId === null) {
      // 기존 회원, kakaoId 업데이트
      await prisma.user.update({
        where: { id: user.id },
        data: { kakaoId },
      });

      if (user.role === "MANAGER" && user.managerProfile) {
        await loginToSession(user.id, user.role, user.managerProfile.id);
        return { success: true, role: user.role };
      } else if (user.role === "TRAINER" && user.trainerProfile) {
        await loginToSession(user.id, user.role, user.trainerProfile.id);
        return { success: true, role: user.role };
      } else if (user.role === "MEMBER" && user.memberProfile) {
        await loginToSession(user.id, user.role, user.memberProfile.id);
        return { success: true, role: user.role };
      } else {
        return { success: false, error: "norole" };
      }
    } else {
      // 신규 회원가입
      const { createRandomUsername } = await import("@/app/lib/socialLogin");
      const username = await createRandomUsername("kakao");

      const newUser = await prisma.$transaction(async (trPrisma) => {
        const createdUser = await trPrisma.user.create({
          data: {
            email,
            kakaoId,
            username,
            mobile: "", // 카카오는 전화번호 미제공
            role: "MEMBER",
          },
        });

        const newMember = await trPrisma.member.create({
          data: {
            userId: createdUser.id,
          },
        });

        return {
          id: createdUser.id,
          role: createdUser.role as UserRole,
          memberId: newMember.id,
        };
      });

      await loginToSession(newUser.id, newUser.role, newUser.memberId);
      return { success: true, role: newUser.role };
    }
  } catch (error) {
    console.error("Kakao login process error:", error);
    return { success: false, error: "unexpected" };
  }
}

// Role Switch 관련 타입 및 함수
export interface RoleSwitchResult {
  success: boolean;
  newRole?: UserRole;
  newRoleId?: string;
  error?: string;
}

// 트레이너 프로필 조회 또는 생성 (Manager용)
async function getOrCreateTrainerProfile(userId: string) {
  // 먼저 기존 트레이너 프로필 확인
  const existingTrainer = await prisma.trainer.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (existingTrainer) {
    return existingTrainer;
  }

  // 없으면 새로 생성
  // MASTER TrainerLevel 찾기
  const masterLevel = await prisma.trainerLevel.findFirst({
    where: { title: "MASTER" },
    select: { id: true },
  });

  // 트레이너 프로필 생성 (MASTER 레벨이 있으면 연결, 없으면 null)
  const newTrainer = await prisma.trainer.create({
    data: {
      userId,
      levelId: masterLevel?.id ?? null,
      introduce: "안녕하세요",
      working: true,
    },
    select: { id: true },
  });

  return newTrainer;
}

// 매니저 프로필 조회 (Trainer용)
async function getManagerProfile(userId: string) {
  const manager = await prisma.manager.findUnique({
    where: { userId },
    select: { id: true },
  });

  return manager;
}

// Role Switch 서비스
export async function switchUserRole(
  sessionId: string,
  currentRole: UserRole
): Promise<RoleSwitchResult> {
  try {
    // 권한 확인 - TRAINER 또는 MANAGER만 가능
    if (currentRole !== "TRAINER" && currentRole !== "MANAGER") {
      return {
        success: false,
        error: "역할 전환 권한이 없습니다",
      };
    }

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        role: true,
        trainerProfile: { select: { id: true } },
        managerProfile: { select: { id: true } },
      },
    });

    if (!user) {
      return {
        success: false,
        error: "사용자를 찾을 수 없습니다",
      };
    }

    // Manager → Trainer 전환
    if (currentRole === "MANAGER") {
      const trainer = await getOrCreateTrainerProfile(user.id);

      return {
        success: true,
        newRole: "TRAINER" as UserRole,
        newRoleId: trainer.id,
      };
    }

    // Trainer → Manager 전환
    if (currentRole === "TRAINER") {
      const manager = await getManagerProfile(user.id);

      if (!manager) {
        return {
          success: false,
          error: "매니저 권한이 없습니다",
        };
      }

      return {
        success: true,
        newRole: "MANAGER" as UserRole,
        newRoleId: manager.id,
      };
    }

    return {
      success: false,
      error: "잘못된 요청입니다",
    };
  } catch (error) {
    console.error("Role switch error:", error);
    return {
      success: false,
      error: "역할 전환 중 오류가 발생했습니다",
    };
  }
}

// 타입 추론

export type SwitchRoleResult = Awaited<ReturnType<typeof switchUserRole>>;
