"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import useSWR from "swr";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { TrainerScheduleCalendar } from "./components/TrainerScheduleCalendar";
import type {
  ITrainerScheduleResponse,
  IDayScheduleData,
} from "@/app/lib/services/trainer-schedule.service";

dayjs.extend(isSameOrBefore);

// SWR fetcher 함수
const fetcher = async (url: string): Promise<ITrainerScheduleResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("스케줄 데이터를 불러오는데 실패했습니다.");
  }
  return response.json();
};

export default function TrainerSchedulePage() {
  // 누적된 스케줄 데이터 상태
  const [accumulatedScheduleData, setAccumulatedScheduleData] = useState<{
    [dateKey: string]: IDayScheduleData;
  }>({});
  const [loadedDateRanges, setLoadedDateRanges] = useState<
    Array<{ start: string; end: string }>
  >([]);
  const [currentFetchRange, setCurrentFetchRange] = useState<{
    startDate?: string;
    endDate?: string;
  }>({});

  // SWR 키 생성
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (currentFetchRange.startDate && currentFetchRange.endDate) {
      params.set("startDate", currentFetchRange.startDate);
      params.set("endDate", currentFetchRange.endDate);
    }
    return `/api/trainer/schedule${
      params.toString() ? `?${params.toString()}` : ""
    }`;
  }, [currentFetchRange]);

  // SWR로 데이터 패칭
  const {
    data: newScheduleData,
    error,
    isLoading,
    mutate,
  } = useSWR<ITrainerScheduleResponse>(apiUrl, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 60000, // 1분간 중복 요청 방지
  });

  // 새로운 데이터가 로드되면 누적 데이터에 병합
  useEffect(() => {
    if (
      newScheduleData &&
      Object.keys(newScheduleData.scheduleData || {}).length > 0
    ) {
      setAccumulatedScheduleData((prev) => ({
        ...prev,
        ...newScheduleData.scheduleData,
      }));

      // 로드된 범위 기록
      if (currentFetchRange.startDate && currentFetchRange.endDate) {
        setLoadedDateRanges((prev) => {
          const newRange = {
            start: currentFetchRange.startDate!,
            end: currentFetchRange.endDate!,
          };
          return [...prev, newRange];
        });
      }
    }
  }, [newScheduleData, currentFetchRange]);

  // 특정 주차 데이터가 이미 로드되어 있는지 확인
  const isWeekDataLoaded = useCallback(
    (startDate: string, endDate: string): boolean => {
      // 누적된 데이터에서 해당 주차의 모든 날짜가 있는지 확인
      let current = dayjs(startDate);
      const end = dayjs(endDate);

      while (current.isSameOrBefore(end)) {
        const dateKey = current.format("YYYY-MM-DD");
        if (!accumulatedScheduleData[dateKey]) {
          return false;
        }
        current = current.add(1, "day"); // dayjs는 immutable이므로 재할당 필요
      }
      return true;
    },
    [accumulatedScheduleData]
  );

  // 주 변경 핸들러
  const handleWeekChange = useCallback(
    (startDate: string, endDate: string) => {
      // 해당 주차 데이터가 없는 경우에만 새로 요청
      if (!isWeekDataLoaded(startDate, endDate)) {
        setCurrentFetchRange({ startDate, endDate });
      }
    },
    [isWeekDataLoaded]
  );

  // 에러 상태
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            데이터 로딩 오류
          </h3>
          <p className="text-gray-600 mb-4">
            {error?.message || "스케줄 데이터를 불러오는데 실패했습니다."}
          </p>
          <button
            onClick={() => mutate()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 초기 로딩 상태 (누적 데이터가 없는 경우)
  if (isLoading && Object.keys(accumulatedScheduleData).length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">스케줄 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">주간 스케줄</h1>
          <p className="text-gray-600">
            PT 수업과 휴무 일정을 확인하세요 (12주간 데이터)
          </p>
        </div>

        <TrainerScheduleCalendar
          scheduleData={{
            scheduleData: accumulatedScheduleData,
            timeRange: newScheduleData?.timeRange || {
              startTime: 900,
              endTime: 2300,
            },
            workingHours: newScheduleData?.workingHours || [],
          }}
          isLoading={isLoading}
          onWeekChange={handleWeekChange}
        />

        {/* 디버그 정보 (개발 중에만) */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              디버그 정보:
            </h3>
            <p className="text-xs text-gray-600">
              누적 로드된 날짜 수: {Object.keys(accumulatedScheduleData).length}
              개
            </p>
            <p className="text-xs text-gray-600">API URL: {apiUrl}</p>
            <p className="text-xs text-gray-600">
              로드된 범위: {loadedDateRanges.length}개 구간
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
