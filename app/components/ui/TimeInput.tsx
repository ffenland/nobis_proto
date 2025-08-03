// app/components/ui/TimeInput.tsx
"use client";

import React from "react";
import {
  formatTimeForInput,
  generateTimeSlots,
  calculateEndTime,
} from "@/app/lib/utils/time.utils";

interface TimeInputProps {
  value: number; // HHMM 형식의 숫자
  onChange: (time: number) => void;
  label?: string;
  openTime?: number;
  closeTime?: number;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export const TimeInput = ({
  value,
  onChange,
  label,
  openTime = 600,
  closeTime = 2200,
  disabled = false,
  error,
  className,
}: TimeInputProps) => {
  // 30분 단위 시간 슬롯 생성
  const timeSlots = generateTimeSlots(openTime, closeTime);

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        {timeSlots.map((time) => (
          <option key={time} value={time}>
            {formatTimeForInput(time)}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

// 시간 범위 선택 컴포넌트 (시작 시간만 선택하고 수업 시간으로 종료 시간 자동 계산)
interface TimeRangeInputProps {
  startTime: number;
  onStartTimeChange: (time: number) => void;
  durationHours: number; // 수업 시간 (시간 단위)
  label?: string;
  openTime?: number;
  closeTime?: number;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export const TimeRangeInput = ({
  startTime,
  onStartTimeChange,
  durationHours,
  label = "시작 시간",
  openTime = 600,
  closeTime = 2200,
  disabled = false,
  error,
  className,
}: TimeRangeInputProps) => {
  // 수업이 끝나는 시간을 고려해서 선택 가능한 시작 시간들만 필터링
  const availableStartTimes = generateTimeSlots(openTime, closeTime).filter(
    (time) => {
      const endTime = calculateEndTime(time, durationHours);
      return endTime <= closeTime;
    }
  );

  // 종료 시간 계산
  const endTime = calculateEndTime(startTime, durationHours);

  // 선택 가능한 시작 시간인지 확인
  const isValidStartTime = availableStartTimes.includes(startTime);

  return (
    <div className={className}>
      <div className="space-y-4">
        <div>
          {label && (
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label}
            </label>
          )}
          <select
            value={startTime}
            onChange={(e) => onStartTimeChange(Number(e.target.value))}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {availableStartTimes.map((time) => (
              <option key={time} value={time}>
                {formatTimeForInput(time)}
              </option>
            ))}
          </select>
          {(error || !isValidStartTime) && (
            <p className="mt-1 text-sm text-red-500">
              {error || "유효하지 않은 시작 시간입니다."}
            </p>
          )}
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-700 mb-1">
            수업 시간
          </div>
          <div className="text-sm text-gray-600">
            {formatTimeForInput(startTime)} - {formatTimeForInput(endTime)}
            <span className="ml-2 text-gray-500">({durationHours}시간)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// 드롭다운 방식의 시간 선택 컴포넌트
interface TimeSelectProps {
  value: number;
  onChange: (time: number) => void;
  label?: string;
  openTime?: number;
  closeTime?: number;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export const TimeSelect = ({
  value,
  onChange,
  label,
  openTime = 600,
  closeTime = 2200,
  disabled = false,
  error,
  className,
}: TimeSelectProps) => {
  const timeSlots = generateTimeSlots(openTime, closeTime);

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        {timeSlots.map((time) => (
          <option key={time} value={time}>
            {formatTimeForInput(time)}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};
