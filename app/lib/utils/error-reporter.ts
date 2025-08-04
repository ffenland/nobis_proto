import * as Sentry from "@sentry/nextjs";

interface ErrorContext {
  action?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

interface UserInfo {
  id: string;
  email?: string;
  username?: string;
  role?: string;
}

// Logger instance removed - using Sentry's built-in console integration instead

/**
 * ErrorReporter - Sentry 에러 리포팅을 위한 유틸리티 클래스
 * 
 * 사용 예시:
 * ```typescript
 * try {
 *   // 코드 실행
 * } catch (error) {
 *   await ErrorReporter.report(error, {
 *     action: "deleteImage",
 *     metadata: { imageId, machineId }
 *   });
 * }
 * ```
 */
export class ErrorReporter {
  /**
   * 에러를 Sentry로 리포트합니다.
   */
  static async report(
    error: Error | unknown,
    context?: ErrorContext
  ): Promise<string | undefined> {
    try {
      // 에러 객체 정규화
      const normalizedError = this.normalizeError(error);
      
      // Sentry로 에러 전송
      const eventId = Sentry.captureException(normalizedError, {
        tags: {
          action: context?.action || "unknown",
          environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
        },
        user: context?.userId ? { id: context.userId } : undefined,
        extra: {
          ...context?.metadata,
          timestamp: new Date().toISOString(),
          userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "server",
        },
        level: "error",
      });

      // 개발 환경에서는 콘솔에도 출력
      if (process.env.NODE_ENV === "development") {
        console.error("🚨 Error Reported to Sentry:", {
          eventId,
          error: normalizedError,
          context,
          timestamp: new Date().toISOString(),
        });
      }

      return eventId;
    } catch (reportError) {
      // 리포팅 자체가 실패한 경우 콘솔에만 기록
      console.error("Failed to report error to Sentry:", reportError);
      console.error("Original error:", error);
      return undefined;
    }
  }

  /**
   * 정보성 메시지를 Sentry로 전송합니다.
   */
  static message(
    message: string,
    level: Sentry.SeverityLevel = "info",
    context?: ErrorContext
  ): string {
    const eventId = Sentry.captureMessage(message, {
      level,
      tags: {
        action: context?.action,
        environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
      },
      extra: context?.metadata,
    });

    if (process.env.NODE_ENV === "development") {
      console.log(`📝 Sentry ${level}:`, message, context);
    }

    return eventId;
  }

  /**
   * 현재 사용자 정보를 설정합니다.
   * 로그인 시 호출하여 모든 후속 에러에 사용자 정보가 포함되도록 합니다.
   */
  static setUser(user: UserInfo | null): void {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      });
    } else {
      Sentry.setUser(null);
    }
  }

  /**
   * 추가 컨텍스트 정보를 설정합니다.
   */
  static setContext(key: string, context: Record<string, any> | null): void {
    Sentry.setContext(key, context);
  }

  /**
   * 태그를 설정합니다.
   */
  static setTag(key: string, value: string): void {
    Sentry.setTag(key, value);
  }

  /**
   * 특정 작업을 추적합니다 (성능 모니터링).
   * @deprecated Use trackUIAction, trackAPICall, or trackDBQuery instead
   */
  static async trackAction<T>(
    action: string,
    callback: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    return Sentry.startSpan(
      {
        name: action,
        op: "task",
        attributes: {
          "task.type": "generic",
          ...metadata,
        },
      },
      async (span) => {
        try {
          const result = await callback();
          span.setStatus({ code: 1, message: "ok" });
          return result;
        } catch (error) {
          span.setStatus({ code: 2, message: "internal_error" });
          await this.report(error, { action, metadata });
          throw error;
        }
      }
    );
  }

  /**
   * UI 인터랙션을 추적합니다.
   */
  static async trackUIAction<T>(
    componentName: string,
    element: string,
    callback: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    return Sentry.startSpan(
      {
        name: `${componentName}.${element}`,
        op: "ui.action.click",
        attributes: {
          "ui.component_name": componentName,
          "ui.element": element,
          ...metadata,
        },
      },
      async (span) => {
        try {
          const result = await callback();
          span.setStatus({ code: 1, message: "ok" });
          return result;
        } catch (error) {
          span.setStatus({ code: 2, message: "internal_error" });
          await this.report(error, { 
            action: `ui.${componentName}.${element}`,
            metadata: { componentName, element, ...metadata }
          });
          throw error;
        }
      }
    );
  }

  /**
   * API 호출을 추적합니다.
   */
  static async trackAPICall<T>(
    endpoint: string,
    method: string,
    callback: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    return Sentry.startSpan(
      {
        name: `${method} ${endpoint}`,
        op: "http.client",
        attributes: {
          "http.method": method,
          "http.url": endpoint,
          "http.request.method": method,
          ...metadata,
        },
      },
      async (span) => {
        try {
          const result = await callback();
          span.setStatus({ code: 1, message: "ok" });
          return result;
        } catch (error) {
          span.setStatus({ code: 2, message: "internal_error" });
          await this.report(error, { 
            action: `api.${method}.${endpoint}`,
            metadata: { endpoint, method, ...metadata }
          });
          throw error;
        }
      }
    );
  }

  /**
   * 데이터베이스 쿼리를 추적합니다.
   */
  static async trackDBQuery<T>(
    operation: string,
    table: string,
    callback: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    return Sentry.startSpan(
      {
        name: `${operation} ${table}`,
        op: "db.query",
        attributes: {
          "db.operation": operation,
          "db.table": table,
          "db.system": "prisma",
          ...metadata,
        },
      },
      async (span) => {
        try {
          const result = await callback();
          span.setStatus({ code: 1, message: "ok" });
          return result;
        } catch (error) {
          span.setStatus({ code: 2, message: "internal_error" });
          await this.report(error, { 
            action: `db.${operation}.${table}`,
            metadata: { operation, table, ...metadata }
          });
          throw error;
        }
      }
    );
  }

  /**
   * 비동기 작업을 래핑하여 자동으로 에러를 리포트합니다.
   */
  static wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    action: string
  ): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        await this.report(error, { 
          action, 
          metadata: { args: args.slice(0, 3) } // 처음 3개 인자만 기록
        });
        throw error;
      }
    }) as T;
  }

  /**
   * 에러를 정규화합니다.
   */
  private static normalizeError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === "string") {
      return new Error(error);
    }

    if (typeof error === "object" && error !== null) {
      // Axios 에러 처리
      if ("response" in error && "status" in (error as any).response) {
        const axiosError = error as any;
        const errorMessage = axiosError.response?.data?.message || 
                           axiosError.message || 
                           "Network request failed";
        const normalizedError = new Error(errorMessage);
        normalizedError.name = "NetworkError";
        (normalizedError as any).status = axiosError.response?.status;
        (normalizedError as any).data = axiosError.response?.data;
        return normalizedError;
      }

      // 일반 객체를 에러로 변환
      try {
        return new Error(JSON.stringify(error));
      } catch {
        return new Error(String(error));
      }
    }

    return new Error(String(error));
  }

  /**
   * Breadcrumb을 추가합니다.
   */
  static addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
    Sentry.addBreadcrumb(breadcrumb);
  }

  /**
   * 현재 스코프를 설정합니다.
   */
  static configureScope(callback: (scope: Sentry.Scope) => void): void {
    const scope = Sentry.getCurrentScope();
    callback(scope);
  }

  /**
   * 새로운 스코프에서 작업을 실행합니다.
   */
  static withScope(callback: (scope: Sentry.Scope) => void): void {
    Sentry.withScope(callback);
  }

  /**
   * Console에 로그를 출력합니다 (개발 환경에서만).
   */
  private static log(level: string, message: string, extra?: any) {
    if (process.env.NODE_ENV === "development") {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
      
      switch (level) {
        case 'debug':
          console.debug(prefix, message, extra || '');
          break;
        case 'info':
          console.info(prefix, message, extra || '');
          break;
        case 'warning':
          console.warn(prefix, message, extra || '');
          break;
        case 'error':
          console.error(prefix, message, extra || '');
          break;
        default:
          console.log(prefix, message, extra || '');
      }
    }
  }


  /**
   * Debug 로그를 기록합니다.
   */
  static debug(message: string, extra?: Record<string, any>): void {
    this.log("debug", message, extra);
  }

  /**
   * Info 로그를 기록합니다.
   */
  static info(message: string, extra?: Record<string, any>): void {
    this.log("info", message, extra);
  }

  /**
   * Warning 로그를 기록합니다.
   */
  static warning(message: string, extra?: Record<string, any>): void {
    this.log("warning", message, extra);
  }

  /**
   * Error 로그를 기록합니다.
   */
  static error(message: string, extra?: Record<string, any>): void {
    this.log("error", message, extra);
  }
}

// 편의를 위한 단축 함수들
export const reportError = ErrorReporter.report.bind(ErrorReporter);
export const trackAction = ErrorReporter.trackAction.bind(ErrorReporter);
export const trackUIAction = ErrorReporter.trackUIAction.bind(ErrorReporter);
export const trackAPICall = ErrorReporter.trackAPICall.bind(ErrorReporter);
export const trackDBQuery = ErrorReporter.trackDBQuery.bind(ErrorReporter);
export const setUser = ErrorReporter.setUser.bind(ErrorReporter);