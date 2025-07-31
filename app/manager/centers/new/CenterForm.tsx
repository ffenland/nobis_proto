// app/manager/centers/new/CenterForm.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import {
  createCenterAction,
  type IServerActionResponse,
} from "../actions";

const initialState: IServerActionResponse = {
  success: false,
};

const weekDays = [
  { key: "MON", label: "월요일" },
  { key: "TUE", label: "화요일" },
  { key: "WED", label: "수요일" },
  { key: "THU", label: "목요일" },
  { key: "FRI", label: "금요일" },
  { key: "SAT", label: "토요일" },
  { key: "SUN", label: "일요일" },
];

// 시간 옵션 생성 (00:00 ~ 24:00, 30분 단위)
const timeOptions = Array.from({ length: 49 }, (_, i) => {
  const totalMinutes = i * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // 24:00은 특별 처리
  if (hours === 24) {
    return {
      value: 2400,
      label: "24:00",
    };
  }

  return {
    value: hours * 100 + minutes,
    label: `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`,
  };
});

export default function CenterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useFormState(createCenterAction, initialState);
  const [closedDays, setClosedDays] = useState<Set<string>>(new Set());

  // 폼 제출 성공 시 리다이렉트
  if (state.success && state.data) {
    startTransition(() => {
      router.push("/manager/centers");
    });
  }

  const handleDayClosedToggle = (dayKey: string) => {
    setClosedDays((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dayKey)) {
        newSet.delete(dayKey);
      } else {
        newSet.add(dayKey);
      }
      return newSet;
    });
  };

  return (
    <form action={formAction} className="space-y-8">
      {/* 에러 메시지 */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                오류가 발생했습니다
              </h3>
              <p className="mt-1 text-sm text-red-700">{state.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 기본 정보 */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">기본 정보</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              센터명 *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              placeholder="예: 강남점"
            />
            {state.fieldErrors?.title && (
              <p className="mt-1 text-sm text-red-600">
                {state.fieldErrors.title}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              전화번호 *
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
              placeholder="02-1234-5678"
            />
            {state.fieldErrors?.phone && (
              <p className="mt-1 text-sm text-red-600">
                {state.fieldErrors.phone}
              </p>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="address"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            주소 *
          </label>
          <input
            type="text"
            id="address"
            name="address"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            placeholder="서울시 강남구 테헤란로 123"
          />
          {state.fieldErrors?.address && (
            <p className="mt-1 text-sm text-red-600">
              {state.fieldErrors.address}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            센터 소개
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            placeholder="센터에 대한 간단한 설명을 입력해주세요."
          />
        </div>
      </div>

      {/* 영업시간 */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">영업시간</h2>

        <div className="space-y-4">
          {weekDays.map((day) => (
            <div key={day.key} className="flex items-center space-x-4">
              <div className="w-16 text-sm font-medium text-gray-700">
                {day.label}
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name={`${day.key}_closed`}
                    checked={closedDays.has(day.key)}
                    onChange={() => handleDayClosedToggle(day.key)}
                    className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">휴무</span>
                </label>

                {!closedDays.has(day.key) && (
                  <div className="flex items-center space-x-2">
                    <select
                      name={`${day.key}_open`}
                      defaultValue="900"
                      className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                    >
                      {timeOptions.map((time) => (
                        <option key={time.value} value={time.value}>
                          {time.label}
                        </option>
                      ))}
                    </select>

                    <span className="text-gray-500">~</span>

                    <select
                      name={`${day.key}_close`}
                      defaultValue="2200"
                      className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                    >
                      {timeOptions.map((time) => (
                        <option key={time.value} value={time.value}>
                          {time.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {state.fieldErrors?.[`${day.key}_time`] && (
                <p className="text-sm text-red-600">
                  {state.fieldErrors[`${day.key}_time`]}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          disabled={isPending}
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "등록 중..." : "센터 등록"}
        </button>
      </div>
    </form>
  );
}
