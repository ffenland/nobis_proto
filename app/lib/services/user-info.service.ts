// app/lib/services/user-info.service.ts
"use server";

import prisma from "@/app/lib/prisma";
import { getSessionOrRedirect } from "@/app/lib/session";
import { UserRole } from "@prisma/client";

// 사용자 정보 응답 타입
export interface IUserInfo {
  username: string;
}

// 사용자 정보 조회 함수
export const getUserInfo = async (requiredRole?: UserRole): Promise<IUserInfo> => {
  const session = await getSessionOrRedirect();

  // 역할 검증 (옵션)
  if (requiredRole && session.role !== requiredRole) {
    throw new Error(`${requiredRole} 권한이 필요합니다.`);
  }

  // session.id를 사용하여 User 테이블에서 사용자명 조회
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      username: true,
    },
  });

  if (!user) {
    throw new Error("사용자 정보를 찾을 수 없습니다.");
  }

  return {
    username: user.username,
  };
};

// Member 전용 사용자 정보 조회
export const getMemberUserInfo = async (): Promise<IUserInfo> => {
  return getUserInfo(UserRole.MEMBER);
};

// Trainer 전용 사용자 정보 조회
export const getTrainerUserInfo = async (): Promise<IUserInfo> => {
  return getUserInfo(UserRole.TRAINER);
};

// Manager 전용 사용자 정보 조회
export const getManagerUserInfo = async (): Promise<IUserInfo> => {
  return getUserInfo(UserRole.MANAGER);
};