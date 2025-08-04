"use client";

import { useState, useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { ErrorReporter, trackUIAction, trackAPICall } from "@/app/lib/utils/error-reporter";
import { ErrorContexts } from "@/app/lib/utils/error-contexts";

export default function TestSentry() {
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  
  useEffect(() => {
    async function checkConnectivity() {
      const result = await Sentry.diagnoseSdkConnectivity();
      setIsConnected(result !== 'sentry-unreachable');
      console.log('Sentry connectivity:', result);
    }
    checkConnectivity();
  }, []);

  // 1. 일반 에러 발생
  const testBasicError = () => {
    throw new Error("테스트: 기본 에러 발생");
  };

  // 2. 비동기 에러 리포트
  const testAsyncError = async () => {
    setIsLoading(true);
    try {
      // 의도적으로 에러 발생
      const response = await fetch("/api/non-existent-endpoint");
      if (!response.ok) {
        throw new Error(`API 에러: ${response.status}`);
      }
    } catch (error) {
      await ErrorReporter.report(error, {
        action: "testAsyncError",
        metadata: {
          description: ErrorContexts.DATA_FETCH,
          testType: "async-api-error",
          endpoint: "/api/non-existent-endpoint",
        }
      });
      alert("에러가 Sentry로 전송되었습니다. 대시보드를 확인하세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. 다양한 에러 컨텍스트 테스트
  const testWithContext = async () => {
    try {
      throw new Error("테스트: 컨텍스트가 포함된 에러");
    } catch (error) {
      await ErrorReporter.report(error, {
        action: "testWithContext",
        userId: "test-user-123",
        metadata: {
          description: ErrorContexts.UNKNOWN_ERROR,
          testData: {
            timestamp: new Date().toISOString(),
            browser: navigator.userAgent,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
          }
        }
      });
      alert("컨텍스트가 포함된 에러가 전송되었습니다.");
    }
  };

  // 4. Promise Rejection 테스트
  const testUnhandledRejection = () => {
    // 의도적으로 처리하지 않은 Promise rejection
    new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error("테스트: 처리되지 않은 Promise rejection"));
      }, 100);
    });
    alert("1초 후 Unhandled Promise Rejection이 발생합니다.");
  };

  // 5. 성능 추적 테스트 (UI Action)
  const testPerformanceTracking = async () => {
    setIsLoading(true);
    try {
      const result = await trackUIAction(
        "TestSentry",
        "button#performance-test",
        async () => {
          // 무거운 작업 시뮬레이션
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // 50% 확률로 에러 발생
          if (Math.random() > 0.5) {
            throw new Error("테스트: 무거운 작업 중 에러 발생");
          }
          
          return "작업 완료";
        },
        {
          testType: "performance",
          duration: "2초",
        }
      );
      alert(`성능 추적 완료: ${result}`);
    } catch {
      alert("성능 추적 중 에러가 발생했습니다 (예상된 동작)");
    } finally {
      setIsLoading(false);
    }
  };

  // 6. 메시지 전송 테스트
  const testMessage = () => {
    ErrorReporter.message(
      "테스트: 정보성 메시지 전송",
      "info",
      {
        action: "testMessage",
        metadata: {
          timestamp: new Date().toISOString(),
        }
      }
    );
    // 로깅 테스트도 추가
    ErrorReporter.info("테스트 정보 로그", { test: true });
    ErrorReporter.warning("테스트 경고 로그", { level: "warning" });
    ErrorReporter.debug("테스트 디버그 로그", { debug: true });
    
    alert("정보성 메시지와 로그가 Sentry로 전송되었습니다.");
  };

  // 7. API 호출 추적 테스트
  const testAPITracking = async () => {
    setIsLoading(true);
    try {
      await trackAPICall(
        "/api/test-endpoint",
        "GET",
        async () => {
          const response = await fetch("/api/non-existent");
          if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
          }
          return response.json();
        },
        {
          testType: "api-tracking",
        }
      );
    } catch {
      alert("API 추적 테스트 완료 (예상된 에러)");
    } finally {
      setIsLoading(false);
    }
  };

  // 8. TypeError 테스트 (fetch가 아닌 에러)
  const testTypeError = async () => {
    try {
      // 의도적으로 TypeError 발생
      const obj = null as any;
      (obj as { someMethod: () => void }).someMethod(); // Cannot read property 'someMethod' of null
    } catch (error) {
      await ErrorReporter.report(error, {
        action: "testTypeError",
        metadata: {
          description: "Null 객체 접근 에러 테스트",
          testType: "type-error",
        }
      });
      alert("TypeError가 Sentry로 전송되었습니다.");
    }
  };

  // 9. ReferenceError 테스트
  const testReferenceError = async () => {
    try {
      // @ts-expect-error - 의도적인 에러
      nonExistentFunction(); // ReferenceError
    } catch (error) {
      await ErrorReporter.report(error, {
        action: "testReferenceError", 
        metadata: {
          description: "정의되지 않은 함수 호출 에러",
          testType: "reference-error",
        }
      });
      alert("ReferenceError가 Sentry로 전송되었습니다.");
    }
  };

  // 10. Custom Error 테스트
  const testCustomError = async () => {
    class CustomBusinessError extends Error {
      constructor(message: string, public code: string) {
        super(message);
        this.name = "CustomBusinessError";
      }
    }

    try {
      throw new CustomBusinessError("비즈니스 로직 에러 발생", "BIZ_001");
    } catch (error) {
      await ErrorReporter.report(error, {
        action: "testCustomError",
        metadata: {
          description: ErrorContexts.PAYMENT_PROCESS,
          testType: "custom-error",
          errorCode: (error as CustomBusinessError).code,
        }
      });
      alert("Custom Error가 Sentry로 전송되었습니다.");
    }
  };

  // 11. 처리되지 않은 에러 테스트 (Sentry 예제와 동일한 방식)
  const testUnhandledError = () => {
    // Sentry 예제와 동일하게 에러를 직접 throw
    throw new Error("테스트: 처리되지 않은 에러 (직접 throw)");
  };

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Sentry 테스트 페이지</h1>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
        <p className="text-yellow-800">
          ⚠️ 이 페이지는 개발 환경에서만 사용하세요. 
          각 버튼을 클릭하면 의도적으로 에러가 발생합니다.
        </p>
        {!isConnected && (
          <p className="text-red-600 mt-2">
            ❌ Sentry 연결이 차단되었습니다. 광고 차단기를 비활성화하거나 네트워크 설정을 확인하세요.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 기본 에러 테스트 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">1. 기본 에러</h2>
          <p className="text-gray-600 mb-4">
            Error Boundary에서 잡히는 동기 에러
          </p>
          <button
            onClick={testBasicError}
            className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
          >
            동기 에러 발생
          </button>
        </div>

        {/* 비동기 에러 테스트 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">2. 비동기 에러</h2>
          <p className="text-gray-600 mb-4">
            API 호출 실패를 시뮬레이션
          </p>
          <button
            onClick={testAsyncError}
            disabled={isLoading}
            className="w-full bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600 disabled:opacity-50"
          >
            {isLoading ? "처리 중..." : "비동기 에러 리포트"}
          </button>
        </div>

        {/* 컨텍스트 포함 에러 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">3. 컨텍스트 포함</h2>
          <p className="text-gray-600 mb-4">
            상세한 메타데이터와 함께 에러 전송
          </p>
          <button
            onClick={testWithContext}
            className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600"
          >
            컨텍스트 에러 전송
          </button>
        </div>

        {/* Promise Rejection */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">4. Promise Rejection</h2>
          <p className="text-gray-600 mb-4">
            처리되지 않은 Promise 에러
          </p>
          <button
            onClick={testUnhandledRejection}
            className="w-full bg-pink-500 text-white py-2 px-4 rounded hover:bg-pink-600"
          >
            Unhandled Rejection 발생
          </button>
        </div>

        {/* 성능 추적 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">5. 성능 추적</h2>
          <p className="text-gray-600 mb-4">
            트랜잭션과 함께 작업 추적 (50% 에러)
          </p>
          <button
            onClick={testPerformanceTracking}
            disabled={isLoading}
            className="w-full bg-indigo-500 text-white py-2 px-4 rounded hover:bg-indigo-600 disabled:opacity-50"
          >
            {isLoading ? "작업 중..." : "성능 추적 테스트"}
          </button>
        </div>

        {/* 메시지 전송 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">6. 메시지 전송</h2>
          <p className="text-gray-600 mb-4">
            에러가 아닌 정보성 메시지
          </p>
          <button
            onClick={testMessage}
            className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            정보 메시지 전송
          </button>
        </div>

        {/* API 추적 테스트 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">7. API 추적</h2>
          <p className="text-gray-600 mb-4">
            API 호출 성능 추적 (실패 예상)
          </p>
          <button
            onClick={testAPITracking}
            disabled={isLoading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? "처리 중..." : "API 추적 테스트"}
          </button>
        </div>

        {/* TypeError 테스트 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">8. TypeError</h2>
          <p className="text-gray-600 mb-4">
            Null 객체 접근 에러 (fetch 아님)
          </p>
          <button
            onClick={testTypeError}
            className="w-full bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600"
          >
            TypeError 발생
          </button>
        </div>

        {/* ReferenceError 테스트 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">9. ReferenceError</h2>
          <p className="text-gray-600 mb-4">
            정의되지 않은 함수 호출
          </p>
          <button
            onClick={testReferenceError}
            className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
          >
            ReferenceError 발생
          </button>
        </div>

        {/* Custom Error 테스트 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">10. Custom Error</h2>
          <p className="text-gray-600 mb-4">
            커스텀 비즈니스 에러
          </p>
          <button
            onClick={testCustomError}
            className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600"
          >
            Custom Error 발생
          </button>
        </div>

        {/* 처리되지 않은 에러 테스트 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">11. 처리되지 않은 에러</h2>
          <p className="text-gray-600 mb-4">
            직접 throw (Sentry 예제와 동일)
          </p>
          <button
            onClick={testUnhandledError}
            className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
            disabled={!isConnected}
          >
            직접 에러 throw
          </button>
        </div>
      </div>

      {/* Sentry 대시보드 확인 안내 */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2">테스트 후 확인사항:</h3>
        <ol className="list-decimal list-inside space-y-1 text-blue-800">
          <li>Sentry 대시보드 (https://sentry.io) 로그인</li>
          <li>프로젝트 선택 (nobiszym_pulsept)</li>
          <li>Issues 탭에서 에러 확인</li>
          <li>Performance 탭에서 트랜잭션 확인</li>
          <li>각 에러의 상세 정보 확인:
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>사용자 정보 (로그인한 경우)</li>
              <li>에러 컨텍스트 (description)</li>
              <li>메타데이터</li>
              <li>스택 트레이스</li>
            </ul>
          </li>
        </ol>
      </div>

      {/* 기존 테스트 페이지 링크 */}
      <div className="mt-4 text-center">
        <a 
          href="/sentry-example-page" 
          className="text-blue-600 hover:underline"
        >
          Sentry 제공 테스트 페이지 →
        </a>
      </div>
    </div>
  );
}