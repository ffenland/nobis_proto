"use client";

import React from "react";

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  blur?: boolean;
}

/**
 * 전체 화면 로딩 오버레이 컴포넌트
 * @param isLoading - 로딩 상태
 * @param message - 로딩 메시지 (선택)
 * @param blur - 배경 블러 효과 (기본: true)
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = "처리 중...",
  blur = true,
}) => {
  if (!isLoading) return null;

  return (
    <div className={`
      fixed inset-0 z-50
      bg-black/50
      ${blur ? 'backdrop-blur-sm' : ''}
      flex items-center justify-center
      transition-all duration-300
    `}>
      <div className="bg-white rounded-lg p-6 shadow-xl">
        <div className="flex flex-col items-center gap-4">
          {/* 스피너 */}
          <div className="relative w-12 h-12">
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="w-12 h-12 rounded-full border-4 border-gray-200"></div>
            </div>
            <div className="absolute top-0 left-0 w-full h-full animate-spin">
              <div className="w-12 h-12 rounded-full border-4 border-transparent border-t-blue-600"></div>
            </div>
          </div>

          {/* 메시지 */}
          <p className="text-sm font-medium text-gray-700">{message}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * 섹션별 로딩 스피너 컴포넌트
 * 특정 영역에만 로딩 표시할 때 사용
 */
export const SectionSpinner: React.FC<{ message?: string }> = ({
  message = "저장 중..."
}) => {
  return (
    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-lg">
      <div className="flex flex-col items-center gap-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-xs font-medium text-gray-600">{message}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;