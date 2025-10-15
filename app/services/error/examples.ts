// app/services/error/examples.ts
// 에러 로깅 시스템 사용 예시들

import { logError, errorLogger, logApiError, extractRequestInfo } from "./error-logging.service";
import { ErrorLevel } from "@prisma/client";

// ========== 1. API Route에서 사용 예시 ==========

export async function exampleApiRoute(request: Request) {
  try {
    // 비즈니스 로직...
    throw new Error("데이터베이스 연결 실패");
  } catch (error) {
    // 방법 1: 상세한 로깅
    await logError({
      message: "사용자 프로필 조회 실패",
      level: ErrorLevel.ERROR,
      error: error as Error,
      errorCode: "USER_001", // 앱에서 정의한 에러 코드
      ...extractRequestInfo(request),
      metadata: {
        action: "getUserProfile",
        userId: "user123",
        additionalInfo: "특별한 상황 설명",
      },
      tags: ["database", "user", "profile"],
    });

    // 방법 2: 간단한 로깅
    await logApiError(request, error as Error, {
      errorCode: "USER_001",
      tags: ["database", "user"],
    });

    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ========== 2. 서비스 레이어에서 사용 예시 ==========

async function userService() {
  try {
    // 사용자 관련 비즈니스 로직
    throw new Error("사용자를 찾을 수 없습니다");
  } catch (error) {
    // 편의 함수 사용
    await errorLogger.error("사용자 서비스 에러", error as Error, {
      service: "UserService",
      function: "findUser",
      userId: "123",
    });

    throw error; // 상위로 에러 전파
  }
}

// ========== 3. 다양한 레벨의 로깅 예시 ==========

async function loggingExamples() {
  // 디버그 로그
  await errorLogger.debug("사용자 검색 쿼리 실행", {
    query: "SELECT * FROM users WHERE id = ?",
    params: ["123"],
  });

  // 정보 로그
  await errorLogger.info("새 사용자 등록", {
    userId: "new-user-123",
    email: "user@example.com",
  });

  // 경고 로그
  await errorLogger.warning("API 응답 시간이 느림", {
    endpoint: "/api/users",
    responseTime: "3.5s",
    threshold: "2s",
  });

  // 에러 로그
  try {
    throw new Error("결제 처리 실패");
  } catch (error) {
    await errorLogger.error("결제 프로세스 에러", error as Error, {
      paymentId: "pay_123",
      amount: 50000,
      userId: "user_456",
    });
  }

  // 치명적 에러 로그
  try {
    throw new Error("데이터베이스 서버 다운");
  } catch (error) {
    await errorLogger.critical("시스템 치명적 오류", error as Error, {
      service: "database",
      impact: "전체 서비스 중단",
      action: "즉시 확인 필요",
    });
  }
}

// ========== 4. 컨텍스트가 있는 에러 로깅 ==========

async function contextualErrorLogging(request: Request, userId?: string) {
  try {
    // PT 기록 생성 로직
    throw new Error("PT 기록 저장 실패");
  } catch (error) {
    await logError({
      message: "PT 기록 생성 중 에러 발생",
      level: ErrorLevel.ERROR,
      error: error as Error,
      errorCode: "PT_001",
      errorType: "DatabaseError",
      userId,
      ...extractRequestInfo(request),
      metadata: {
        module: "PT 기록",
        action: "create_record",
        lessonId: "lesson_123",
        exerciseType: "FREE_WEIGHT",
        attemptedData: {
          exercise: "데드리프트",
          weight: "100kg",
          reps: 8,
        },
      },
      tags: ["pt", "record", "database", "critical"],
    });
  }
}

// ========== 5. 에러 조회 및 모니터링 예시 ==========

async function errorMonitoringExamples() {
  // 최근 에러 조회
  const recentErrors = await import("./error-logging.service").then(service =>
    service.getRecentErrors(50)
  );

  // 치명적 에러만 조회
  const criticalErrors = await import("./error-logging.service").then(service =>
    service.getErrorsByLevel(ErrorLevel.CRITICAL)
  );

  // 미해결 에러 조회
  const unresolvedErrors = await import("./error-logging.service").then(service =>
    service.getUnresolvedErrors()
  );

  return {
    recent: recentErrors,
    critical: criticalErrors,
    unresolved: unresolvedErrors,
  };
}

// ========== 6. Next.js 미들웨어에서 사용 예시 ==========

export async function middlewareErrorLogging(request: Request) {
  try {
    // 인증 체크 등의 로직
    const token = request.headers.get("authorization");
    if (!token) {
      throw new Error("인증 토큰 없음");
    }
  } catch (error) {
    await logError({
      message: "미들웨어 인증 실패",
      level: ErrorLevel.WARNING,
      error: error as Error,
      errorCode: "AUTH_001",
      ...extractRequestInfo(request),
      tags: ["auth", "middleware"],
    });

    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
}

// ========== 7. 프론트엔드에서 보낸 에러 로깅 ==========

export async function logClientError(request: Request) {
  try {
    const body = await request.json();

    await logError({
      message: body.message || "클라이언트 에러",
      level: ErrorLevel.ERROR,
      errorType: "ClientError",
      ...extractRequestInfo(request),
      metadata: {
        clientError: true,
        userAgent: body.userAgent,
        url: body.url,
        stack: body.stack,
        component: body.component,
      },
      tags: ["client", "frontend"],
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("클라이언트 에러 로깅 실패:", error);
    return Response.json({ error: "Failed to log error" }, { status: 500 });
  }
}