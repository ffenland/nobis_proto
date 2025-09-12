import prisma from '@/app/lib/prisma';
import type { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

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

// 회원가입/로그인 스키마
export const SignUpSchema = z.object({
  username: z.string().min(3, "사용자명은 최소 3자 이상이어야 합니다"),
  email: z.string().email("올바른 이메일 형식이 아닙니다"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  mobile: z.string().regex(/^010\d{8}$/, "올바른 휴대폰 번호 형식이 아닙니다"),
  role: z.enum(["MEMBER", "TRAINER"], {
    errorMap: () => ({ message: "역할을 선택해주세요" })
  })
});

export const LoginSchema = z.object({
  username: z.string().min(1, "사용자명을 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

export type SignUpInput = z.infer<typeof SignUpSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

// 회원가입 서비스
export async function signUp(data: SignUpInput) {
  try {
    // 입력값 검증
    const validatedData = SignUpSchema.parse(data);
    
    // 중복 체크
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: validatedData.username },
          { email: validatedData.email },
          { mobile: validatedData.mobile }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.username === validatedData.username) {
        throw new Error("이미 사용 중인 사용자명입니다");
      }
      if (existingUser.email === validatedData.email) {
        throw new Error("이미 사용 중인 이메일입니다");
      }
      if (existingUser.mobile === validatedData.mobile) {
        throw new Error("이미 사용 중인 휴대폰 번호입니다");
      }
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // 트랜잭션으로 User와 역할 모델 생성
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: validatedData.username,
          email: validatedData.email,
          password: hashedPassword,
          mobile: validatedData.mobile,
          role: validatedData.role,
        }
      });

      let roleData;
      if (validatedData.role === "MEMBER") {
        roleData = await tx.member.create({
          data: {
            userId: user.id,
          },
          select: {
            id: true
          }
        });
      } else {
        roleData = await tx.trainer.create({
          data: {
            userId: user.id,
          },
          select: {
            id: true
          }
        });
      }

      return {
        user,
        roleId: roleData.id
      };
    });

    return {
      success: true,
      data: {
        id: result.user.id,
        role: result.user.role,
        roleId: result.roleId
      }
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message
      };
    }
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message
      };
    }
    return {
      success: false,
      error: "회원가입 중 오류가 발생했습니다"
    };
  }
}

// 비밀번호 로그인 서비스
export async function passwordLogin(data: LoginInput) {
  try {
    // 입력값 검증
    const validatedData = LoginSchema.parse(data);
    
    // 사용자 찾기
    const user = await prisma.user.findFirst({
      where: {
        username: validatedData.username
      },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        role: true,
        memberProfile: {
          select: {
            id: true
          }
        },
        trainerProfile: {
          select: {
            id: true
          }
        },
        managerProfile: {
          select: {
            id: true
          }
        }
      }
    });

    if (!user || !user.password) {
      return {
        success: false,
        error: "사용자명 또는 비밀번호가 일치하지 않습니다"
      };
    }

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);
    
    if (!isPasswordValid) {
      return {
        success: false,
        error: "사용자명 또는 비밀번호가 일치하지 않습니다"
      };
    }

    // 역할 확인
    let roleId: string;
    
    if (user.memberProfile) {
      roleId = user.memberProfile.id;
    } else if (user.trainerProfile) {
      roleId = user.trainerProfile.id;
    } else if (user.managerProfile) {
      roleId = user.managerProfile.id;
    } else {
      return {
        success: false,
        error: "사용자 역할을 찾을 수 없습니다"
      };
    }

    return {
      success: true,
      data: {
        id: user.id,
        role: user.role,
        roleId: roleId
      }
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message
      };
    }
    return {
      success: false,
      error: "로그인 중 오류가 발생했습니다"
    };
  }
}

// 타입 추론
export type SignUpResult = Awaited<ReturnType<typeof signUp>>;
export type LoginResult = Awaited<ReturnType<typeof passwordLogin>>;