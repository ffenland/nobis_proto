"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              예기치 않은 오류가 발생했습니다
            </h1>
            <p className="text-gray-600 mb-6">
              불편을 드려 죄송합니다. 문제가 계속되면 고객센터로 문의해주세요.
            </p>
            <div className="flex gap-4">
              <button
                onClick={reset}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
              >
                다시 시도
              </button>
              <button
                onClick={() => window.location.href = "/"}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
              >
                홈으로
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}