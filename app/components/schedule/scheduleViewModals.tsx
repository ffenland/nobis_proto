// app/components/schedule/ScheduleViewModals.tsx
"use client";

import React from "react";
import {
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface IBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface IErrorModalProps extends IBaseModalProps {
  title?: string;
  message: string;
  onConfirm?: () => void;
}

interface ILimitModalProps extends IBaseModalProps {
  onConfirm?: () => void;
}

// 기본 모달 래퍼
function ModalWrapper({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 백드롭 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* 모달 컨테이너 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}

// 에러 모달
export function ErrorModal({
  isOpen,
  onClose,
  title = "오류가 발생했습니다",
  message,
  onConfirm,
}: IErrorModalProps) {
  const handleConfirm = () => {
    onClose();
    onConfirm?.();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <div className="px-6 py-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* 내용 */}
        <div className="mb-6">
          <p className="text-gray-600 leading-relaxed">{message}</p>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end">
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            확인
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}

// 12주 제한 모달
export function WeekLimitModal({
  isOpen,
  onClose,
  onConfirm,
}: ILimitModalProps) {
  const handleConfirm = () => {
    onClose();
    onConfirm?.();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose}>
      <div className="px-6 py-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              스케줄 조회 제한
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* 내용 */}
        <div className="mb-6">
          <p className="text-gray-600 leading-relaxed">
            최대 12주까지의 스케줄만 조회할 수 있습니다.
            <br />더 이상 스케줄을 확인할 수 없습니다.
          </p>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end">
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
          >
            확인
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}
