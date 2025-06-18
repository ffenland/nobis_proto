// app/lib/rateLimit.ts

import prisma from "./prisma";

const WINDOW_SIZE = 10; // 10초
const MAX_REQUESTS = 10; // 최대 10회 요청

export const checkRateLimit = async (ip: string, userId: string) => {
  const now = new Date();

  // 기존 레코드 찾기
  const existingLimit = await prisma.rateLimit.findUnique({
    where: {
      ip_userId: {
        ip,
        userId,
      },
    },
  });

  if (!existingLimit) {
    // 새로운 IP와 userId의 첫 요청
    await prisma.rateLimit.create({
      data: {
        ip,
        userId,
        count: 1,
        resetAt: new Date(now.getTime() + WINDOW_SIZE * 1000),
      },
    });
    return true;
  }

  // 시간이 지났으면 리셋
  if (now > existingLimit.resetAt) {
    await prisma.rateLimit.update({
      where: {
        ip_userId: {
          ip,
          userId,
        },
      },
      data: {
        count: 1,
        resetAt: new Date(now.getTime() + WINDOW_SIZE * 1000),
      },
    });
    return true;
  }

  // 요청 횟수 체크
  if (existingLimit.count >= MAX_REQUESTS) {
    return false;
  }

  // 요청 횟수 증가
  await prisma.rateLimit.update({
    where: {
      ip_userId: {
        ip,
        userId,
      },
    },
    data: {
      count: existingLimit.count + 1,
    },
  });
  return true;
};
