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

// 타입 추론 헬퍼
export type GetSessionUserInfoResult = Awaited<ReturnType<typeof getSessionUserInfo>>;