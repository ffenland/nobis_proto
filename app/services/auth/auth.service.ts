import prisma from '@/app/lib/prisma';
import type { UserRole } from '@prisma/client';

// 타입 정의
export interface SessionUser {
  id: string;
  roleId: string;
  role: UserRole;
  name: string;
  username: string;
  email: string;
  mobile: string;
  avatarImageId: string | null;
  hasManagerProfile: boolean;
  hasTrainerProfile: boolean;
  hasMemberProfile: boolean;
}

export interface SessionResponse {
  isAuthenticated: boolean;
  user: SessionUser | null;
  roleManagementAuth?: boolean;
  roleManagementAuthTime?: number;
}

// 세션 정보 조회 서비스
export async function getSessionUserInfo(
  sessionId: string,
  sessionRole: UserRole,
  sessionRoleId: string
): Promise<SessionUser> {
  // User 정보와 모든 프로필 조회
  const user = await prisma.user.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      username: true,
      email: true,
      mobile: true,
      avatarImageId: true,
      role: true,
      trainerProfile: {
        select: { 
          id: true,
          introduce: true,
          level: true
        }
      },
      managerProfile: {
        select: { id: true }
      },
      memberProfile: {
        select: { id: true }
      }
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // 현재 역할에 따른 이름 조회
  let name = '';
  
  if (sessionRole === 'TRAINER' && user.trainerProfile) {
    const trainer = await prisma.trainer.findUnique({
      where: { id: sessionRoleId },
      select: { 
        user: {
          select: { username: true }
        }
      }
    });
    name = trainer?.user.username || user.username;
  } else if (sessionRole === 'MEMBER' && user.memberProfile) {
    const member = await prisma.member.findUnique({
      where: { id: sessionRoleId },
      select: { 
        user: {
          select: { username: true }
        }
      }
    });
    name = member?.user.username || user.username;
  } else if (sessionRole === 'MANAGER' && user.managerProfile) {
    const manager = await prisma.manager.findUnique({
      where: { id: sessionRoleId },
      select: { 
        user: {
          select: { username: true }
        }
      }
    });
    name = manager?.user.username || user.username;
  }

  return {
    id: user.id,
    roleId: sessionRoleId,
    role: sessionRole,
    name: name || user.username,
    username: user.username,
    email: user.email,
    mobile: user.mobile,
    avatarImageId: user.avatarImageId,
    hasManagerProfile: !!user.managerProfile,
    hasTrainerProfile: !!user.trainerProfile,
    hasMemberProfile: !!user.memberProfile
  };
}

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
    (currentRole === 'MANAGER' && targetRole === 'TRAINER') ||
    (currentRole === 'TRAINER' && targetRole === 'MANAGER')
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
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '로그아웃에 실패했습니다.');
    }

    return data;
  } catch (error) {
    console.error('로그아웃 서비스 에러:', error);
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
export async function processKakaoLogin(code: string): Promise<KakaoLoginResult> {
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
      return { success: false, error: 'failkakaotoken' };
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
      return { success: false, error: 'failkakao' };
    }

    const kakaoId = userProfile.id.toString();
    const email = userProfile.kakao_account?.email;

    if (!email) {
      return { success: false, error: 'noemail' };
    }

    // 3. 사용자 확인 및 로그인/회원가입 처리
    const { loginToSession } = await import('@/app/lib/socialLogin');
    
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
        return { success: false, error: 'norole' };
      }
    } else if (user && user.kakaoId !== kakaoId) {
      // 이메일은 있지만 다른 소셜 로그인 사용
      return { success: false, error: 'alreadynaver' };
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
        return { success: false, error: 'norole' };
      }
    } else {
      // 신규 회원가입
      const { createRandomUsername } = await import('@/app/lib/socialLogin');
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
          memberId: newMember.id 
        };
      });

      await loginToSession(newUser.id, newUser.role, newUser.memberId);
      return { success: true, role: newUser.role };
    }
  } catch (error) {
    console.error('Kakao login process error:', error);
    return { success: false, error: 'unexpected' };
  }
}

// 타입 추론 헬퍼
export type GetSessionUserInfoResult = Awaited<ReturnType<typeof getSessionUserInfo>>;