// app/services/error/error-logging.service.ts
import prisma from "@/app/lib/prisma";
import { ErrorLevel, ErrorEnvironment } from "@prisma/client";
import crypto from "crypto";

// 에러 로깅을 위한 타입 정의
export interface LogErrorOptions {
  // 필수 정보
  message: string;
  level?: ErrorLevel;

  // 에러 세부 정보
  errorCode?: string;
  errorType?: string;
  error?: Error; // Error 객체 (스택 트레이스 추출용)

  // 컨텍스트 정보
  userId?: string;
  userAgent?: string;
  ipAddress?: string;

  // 요청 정보
  method?: string;
  url?: string;
  endpoint?: string;

  // 추가 정보
  metadata?: Record<string, any>;
  tags?: string[];
}

// 환경 감지 함수
function getEnvironment(): ErrorEnvironment {
  const env = process.env.NODE_ENV;
  switch (env) {
    case "development":
      return ErrorEnvironment.DEVELOPMENT;
    case "test":
      return ErrorEnvironment.STAGING;
    case "production":
      return ErrorEnvironment.PRODUCTION;
    default:
      return ErrorEnvironment.DEVELOPMENT;
  }
}

// 에러 지문 생성 (동일한 에러 식별용)
function generateErrorFingerprint(
  message: string,
  errorType?: string,
  endpoint?: string
): string {
  const combined = `${message}-${errorType || "unknown"}-${
    endpoint || "unknown"
  }`;
  return crypto.createHash("md5").update(combined).digest("hex");
}

// Request 객체에서 정보 추출
export function extractRequestInfo(request: Request) {
  const url = new URL(request.url);
  return {
    method: request.method,
    url: request.url,
    endpoint: url.pathname,
    userAgent: request.headers.get("user-agent") || undefined,
    // IP는 프록시 환경에서 다를 수 있음
    ipAddress:
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      undefined,
  };
}

// 메인 에러 로깅 함수
export async function logError(options: LogErrorOptions) {
  try {
    const {
      message,
      level = ErrorLevel.ERROR,
      errorCode,
      errorType,
      error,
      userId,
      userAgent,
      ipAddress,
      method,
      url,
      endpoint,
      metadata,
      tags = [],
    } = options;

    // 에러 객체가 있으면 스택 트레이스와 타입 추출
    const stackTrace = error?.stack;
    const finalErrorType = errorType || error?.constructor?.name;

    // 에러 지문 생성
    const fingerprint = generateErrorFingerprint(
      message,
      finalErrorType,
      endpoint
    );

    // 동일한 에러가 이미 있는지 확인
    const existingError = await prisma.systemError.findFirst({
      where: { fingerprint },
      orderBy: { lastOccurredAt: "desc" },
    });

    if (existingError) {
      // 기존 에러가 있으면 발생 횟수와 마지막 발생 시간 업데이트
      await prisma.systemError.update({
        where: { id: existingError.id },
        data: {
          occurrenceCount: existingError.occurrenceCount + 1,
          lastOccurredAt: new Date(),
          // 새로운 메타데이터가 있으면 병합
          ...(metadata && {
            metadata: {
              ...((existingError.metadata as Record<string, any>) || {}),
              ...metadata,
              latestOccurrence: new Date().toISOString(),
            },
          }),
        },
      });

      console.log(
        `🔄 기존 에러 업데이트: ${fingerprint} (총 ${
          existingError.occurrenceCount + 1
        }회)`
      );
      return existingError.id;
    } else {
      // 새로운 에러 생성
      const systemError = await prisma.systemError.create({
        data: {
          level,
          environment: getEnvironment(),
          message,
          errorCode,
          errorType: finalErrorType,
          stackTrace,
          userId,
          userAgent,
          ipAddress,
          method,
          url,
          endpoint,
          metadata: metadata as any,
          tags,
          fingerprint,
          occurrenceCount: 1,
          lastOccurredAt: new Date(),
        },
      });

      console.log(`🚨 새 에러 로그 생성: ${systemError.id}`);
      return systemError.id;
    }
  } catch (loggingError) {
    // 로깅 자체에서 에러가 발생한 경우 콘솔에만 출력
    console.error("❌ 에러 로깅 실패:", loggingError);
    console.error("원본 에러:", options.message);
    return null;
  }
}

// 편의 함수들
export const errorLogger = {
  // 디버그 로그
  debug: (message: string, metadata?: Record<string, any>) =>
    logError({ message, level: ErrorLevel.DEBUG, metadata }),

  // 정보 로그
  info: (message: string, metadata?: Record<string, any>) =>
    logError({ message, level: ErrorLevel.INFO, metadata }),

  // 경고 로그
  warning: (message: string, metadata?: Record<string, any>) =>
    logError({ message, level: ErrorLevel.WARNING, metadata }),

  // 에러 로그
  error: (message: string, error?: Error, metadata?: Record<string, any>) =>
    logError({ message, level: ErrorLevel.ERROR, error, metadata }),

  // 치명적 에러 로그
  critical: (message: string, error?: Error, metadata?: Record<string, any>) =>
    logError({ message, level: ErrorLevel.CRITICAL, error, metadata }),
};

// API Route에서 사용하기 쉬운 헬퍼 함수
export async function logApiError(
  request: Request,
  error: Error,
  options?: Partial<LogErrorOptions>
) {
  const requestInfo = extractRequestInfo(request);

  return logError({
    message: error.message,
    level: ErrorLevel.ERROR,
    error,
    ...requestInfo,
    ...options,
  });
}

// 에러 조회 함수들
export async function getRecentErrors(limit = 20) {
  return prisma.systemError.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  });
}

export async function getErrorsByLevel(level: ErrorLevel, limit = 20) {
  return prisma.systemError.findMany({
    where: { level },
    take: limit,
    orderBy: { createdAt: "desc" },
  });
}

export async function getUnresolvedErrors() {
  return prisma.systemError.findMany({
    where: {
      status: {
        in: ["NEW", "INVESTIGATING", "IN_PROGRESS"],
      },
    },
    orderBy: [
      { level: "desc" }, // CRITICAL이 먼저
      { createdAt: "desc" },
    ],
  });
}
