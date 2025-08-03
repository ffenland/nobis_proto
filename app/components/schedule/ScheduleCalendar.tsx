"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";
import weekday from "dayjs/plugin/weekday";
import { useRouter } from "next/navigation";

import { getWeekDayMapData } from "@/app/lib/utils";
import { formatTime } from "@/app/lib/utils/time.utils";
import {
  ErrorModal,
  WeekLimitModal,
} from "@/app/components/schedule/scheduleViewModals";
import type {
  IScheduleViewItem,
  IOffViewItem,
  ITrainerScheduleViewData,
} from "@/app/lib/services/schedule-view.service";

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(weekday);
dayjs.locale("ko");

interface IScheduleCalendarProps {
  trainerId: string;
  forManager?: boolean;
}

// 9:00 ~ 23:00, 30분 단위 (총 28개 슬롯)
const TIME_SLOTS = Array.from(
  { length: (23 - 9) * 2 + 1 },
  (_, i) => 900 + Math.floor(i / 2) * 100 + (i % 2) * 30
);

const MAX_WEEKS = 12;

// 날짜별 스케줄 데이터 타입
interface IDayScheduleData {
  schedules: IScheduleViewItem[];
  offs: IOffViewItem[];
}

// loadedWeekData 타입
type LoadedWeekData = Record<string, IDayScheduleData | null>;

export function ScheduleCalendar({
  trainerId,
  forManager = false,
}: IScheduleCalendarProps) {
  const router = useRouter();

  // 상태 관리
  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = dayjs();
    return today.startOf("week").add(1, "day"); // 월요일
  });

  const [loadedWeekData, setLoadedWeekData] = useState<LoadedWeekData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 모달 상태
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const today = dayjs();

  // API 엔드포인트 결정 - unused function but kept for potential future use
  // const getApiEndpoint = useCallback(() => {
  //   return forManager ? "/api/manager/schedule" : "/api/trainer/schedule";
  // }, [forManager]);

  // 날짜 키 생성 (YYYY-MM-DD 형식) - unused function but kept for potential future use
  // const getDateKey = useCallback((date: dayjs.Dayjs) => {
  //   return date.format("YYYY-MM-DD");
  // }, []);

  // 특정 주의 날짜들 가져오기 - unused function but kept for potential future use
  // const getWeekDates = useCallback((week: dayjs.Dayjs) => {
  //   return Array.from({ length: 7 }, (_, i) => {
  //     return week.add(i, "day").format("YYYY-MM-DD");
  //   });
  // }, []);

  // 특정 날짜 범위의 데이터 로드
  const loadScheduleData = useCallback(
    async (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs) => {
      try {
        setIsLoading(true);
        setError(null);

        const endpoint = forManager
          ? "/api/manager/schedule"
          : "/api/trainer/schedule";
        const params = new URLSearchParams({
          startDate: startDate.format("YYYY-MM-DD"),
          endDate: endDate.format("YYYY-MM-DD"),
          ...(forManager && { trainerId }),
        });

        const response = await fetch(`${endpoint}?${params}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "스케줄 조회에 실패했습니다.");
        }

        const data: ITrainerScheduleViewData = await response.json();
        return data;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "알 수 없는 오류가 발생했습니다.";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [forManager, trainerId]
  );

  // 서버 데이터를 loadedWeekData에 반영
  const updateLoadedWeekData = useCallback(
    (
      data: ITrainerScheduleViewData,
      startDate: dayjs.Dayjs,
      endDate: dayjs.Dayjs
    ) => {
      setLoadedWeekData((prev) => {
        const updated = { ...prev };

        // 날짜 범위 내의 모든 날짜에 대해 빈 배열로 초기화
        let currentDate = startDate;
        while (
          currentDate.isBefore(endDate) ||
          currentDate.isSame(endDate, "day")
        ) {
          const dateKey = currentDate.format("YYYY-MM-DD");
          if (updated[dateKey] === null) {
            updated[dateKey] = { schedules: [], offs: [] };
          }
          currentDate = currentDate.add(1, "day");
        }

        // 스케줄 데이터 분배
        data.schedules.forEach((schedule) => {
          const dateKey = dayjs(schedule.ptSchedule.date).format("YYYY-MM-DD");
          if (updated[dateKey]) {
            updated[dateKey]!.schedules.push(schedule);
          }
        });

        // 오프 데이터 분배
        data.offs.forEach((off) => {
          const dateKey = dayjs(off.date).format("YYYY-MM-DD");
          if (updated[dateKey]) {
            updated[dateKey]!.offs.push(off);
          }
        });

        return updated;
      });
    },
    []
  );

  // 초기 데이터 로드
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // today를 useEffect 내부에서 계산
        const currentToday = dayjs();
        const startDate = currentToday
          .subtract(2, "week")
          .startOf("week")
          .add(1, "day");
        const endDate = currentToday
          .add(3, "week")
          .startOf("week")
          .add(7, "day");

        // 날짜 범위 생성
        const dateRange: LoadedWeekData = {};
        let currentDate = startDate;
        while (
          currentDate.isBefore(endDate) ||
          currentDate.isSame(endDate, "day")
        ) {
          dateRange[currentDate.format("YYYY-MM-DD")] = null;
          currentDate = currentDate.add(1, "day");
        }

        setLoadedWeekData(dateRange);

        const data = await loadScheduleData(startDate, endDate);
        updateLoadedWeekData(data, startDate, endDate);
      } catch {
        setShowErrorModal(true);
      }
    };

    loadInitialData();
  }, [trainerId, forManager]);

  // 특정 주가 로드되었는지 확인
  const isWeekLoaded = useCallback(
    (week: dayjs.Dayjs) => {
      const weekDates = Array.from({ length: 7 }, (_, i) => {
        return week.add(i, "day").format("YYYY-MM-DD");
      });
      return weekDates.every(
        (dateKey) => loadedWeekData[dateKey] !== undefined
      );
    },
    [loadedWeekData]
  );

  // 누락된 주차 데이터 로드
  const loadMissingWeekData = useCallback(
    async (week: dayjs.Dayjs) => {
      const startDate = week;
      const endDate = week.add(6, "day");

      // 날짜 키 추가
      setLoadedWeekData((prev) => {
        const updated = { ...prev };
        let currentDate = startDate;
        while (
          currentDate.isBefore(endDate) ||
          currentDate.isSame(endDate, "day")
        ) {
          const dateKey = currentDate.format("YYYY-MM-DD");
          if (updated[dateKey] === undefined) {
            updated[dateKey] = null;
          }
          currentDate = currentDate.add(1, "day");
        }
        return updated;
      });

      // 서버에서 데이터 로드
      const data = await loadScheduleData(startDate, endDate);
      updateLoadedWeekData(data, startDate, endDate);
    },
    [loadScheduleData, updateLoadedWeekData]
  );

  // 이전 주로 이동
  const handlePrevWeek = useCallback(async () => {
    const prevWeek = currentWeek.subtract(1, "week");

    // 과거 3개월 이전은 불가
    if (prevWeek.isBefore(today.subtract(3, "month"))) {
      return;
    }

    setCurrentWeek(prevWeek);

    // 데이터가 없으면 로드
    if (!isWeekLoaded(prevWeek)) {
      try {
        await loadMissingWeekData(prevWeek);
      } catch {
        setShowErrorModal(true);
      }
    }
  }, [currentWeek, today, isWeekLoaded, loadMissingWeekData]);

  // 다음 주로 이동
  const handleNextWeek = useCallback(async () => {
    const nextWeek = currentWeek.add(1, "week");

    // 12주 제한 확인
    const weeksFromToday = nextWeek.diff(
      today.startOf("week").add(1, "day"),
      "week"
    );

    if (weeksFromToday >= MAX_WEEKS) {
      setShowLimitModal(true);
      return;
    }

    setCurrentWeek(nextWeek);

    // 데이터가 없으면 로드
    if (!isWeekLoaded(nextWeek)) {
      try {
        await loadMissingWeekData(nextWeek);
      } catch {
        setShowErrorModal(true);
      }
    }
  }, [currentWeek, today, isWeekLoaded, loadMissingWeekData]);

  // 현재 주의 요일들 계산
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = currentWeek.add(i, "day");
        return {
          date,
          dayInfo: getWeekDayMapData(date.toDate()),
          dateKey: date.format("YYYY-MM-DD"),
        };
      }),
    [currentWeek]
  );

  // 특정 날짜, 시간의 PT 스케줄 찾기
  const getScheduleBlock = useCallback(
    (dateKey: string, time: number): IScheduleViewItem | undefined => {
      const dayData = loadedWeekData[dateKey];
      if (!dayData) return undefined;

      return dayData.schedules.find(
        (schedule) =>
          schedule.ptSchedule.startTime <= time &&
          schedule.ptSchedule.endTime > time
      );
    },
    [loadedWeekData]
  );

  // 특정 날짜, 시간의 오프 스케줄 찾기
  const getOffBlock = useCallback(
    (dateKey: string, time: number): IOffViewItem | undefined => {
      const dayData = loadedWeekData[dateKey];
      if (!dayData) return undefined;

      return dayData.offs.find(
        (off) => off.startTime <= time && off.endTime > time
      );
    },
    [loadedWeekData]
  );

  // 스케줄 블록 스타일링
  const getBlockStyle = useCallback(
    (
      schedule: IScheduleViewItem | undefined,
      off: IOffViewItem | undefined,
      isTimeColumn: boolean,
      isPastDate: boolean
    ) => {
      if (schedule) {
        switch (schedule.status) {
          case "ATTENDED":
            return "bg-green-200 text-green-900 font-bold";
          case "ABSENT":
            return "bg-red-200 text-red-900 font-bold";
          case "RESERVED":
            return "bg-blue-200 text-blue-900 font-bold";
          default:
            return "bg-gray-200 text-gray-900";
        }
      }

      if (off) {
        switch (off.type) {
          case "TRAINER_OFF":
            return "bg-orange-200 text-orange-900 font-bold";
          case "CENTER_REGULAR_OFF":
            return "bg-gray-300 text-gray-800 font-bold";
          case "CENTER_SPECIAL_OFF":
            return "bg-purple-200 text-purple-900 font-bold";
          default:
            return "bg-gray-200 text-gray-900";
        }
      }

      if (isTimeColumn) return "bg-gray-100";
      if (isPastDate) return "bg-gray-100";

      return "bg-white hover:bg-gray-50";
    },
    []
  );

  // 블록 내용 텍스트
  const getBlockContent = useCallback(
    (
      schedule: IScheduleViewItem | undefined,
      off: IOffViewItem | undefined
    ): string => {
      if (schedule) {
        return schedule.pt.member?.user.username ?? "PT";
      }

      if (off) {
        switch (off.type) {
          case "TRAINER_OFF":
            return "개인 OFF";
          case "CENTER_REGULAR_OFF":
            return "휴관";
          case "CENTER_SPECIAL_OFF":
            return "특별 휴무";
          default:
            return "휴무";
        }
      }

      return "";
    },
    []
  );

  // 툴팁 텍스트 생성
  const getTooltipText = useCallback(
    (
      schedule: IScheduleViewItem | undefined,
      off: IOffViewItem | undefined
    ): string => {
      if (schedule) {
        const statusText = {
          ATTENDED: "완료",
          ABSENT: "결석",
          RESERVED: "예정",
        }[schedule.status];
        return `${schedule.pt.member?.user.username} - ${statusText}`;
      }

      if (off) {
        const typeText = {
          TRAINER_OFF: "개인 휴무",
          CENTER_REGULAR_OFF: "센터 정기 휴무",
          CENTER_SPECIAL_OFF: "센터 특별 휴무",
        }[off.type];

        return off.description ? `${typeText}: ${off.description}` : typeText;
      }

      return "";
    },
    []
  );

  // 네비게이션 가능 여부 확인
  const canGoPrev = currentWeek.isAfter(
    today.subtract(3, "month").startOf("week").add(1, "day")
  );
  const canGoNext =
    currentWeek.diff(today.startOf("week").add(1, "day"), "week") <
    MAX_WEEKS - 1;

  // 에러 모달 확인 시 상위 페이지로 리다이렉트
  const handleErrorConfirm = () => {
    router.back();
  };

  return (
    <div className="w-full relative">
      {/* 네비게이션 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevWeek}
          className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          disabled={isLoading || !canGoPrev}
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>

        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900">
            {currentWeek.format("YYYY년 MM월 DD일")} -{" "}
            {currentWeek.add(6, "day").format("MM월 DD일")}
          </h2>
        </div>

        <button
          onClick={handleNextWeek}
          className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          disabled={isLoading || !canGoNext}
        >
          <ChevronRightIcon className="h-6 w-6" />
        </button>
      </div>

      {/* 캘린더 그리드 */}
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <div className="grid grid-cols-8 gap-0">
          {/* 헤더: 시간 + 요일들 */}
          <div className="h-12 bg-gray-50 border-r border-b flex items-center justify-center font-semibold text-sm">
            시간
          </div>

          {weekDays.map(({ date, dayInfo, dateKey }) => (
            <div
              key={dateKey}
              className={`h-12 border-r last:border-r-0 border-b flex flex-col items-center justify-center font-semibold text-sm ${dayInfo.color}`}
            >
              <div>{dayInfo.kor.short}</div>
              <div className="text-xs text-gray-500">
                {date.format("MM/DD")}
              </div>
            </div>
          ))}

          {/* 시간대별 행들 */}
          {TIME_SLOTS.map((time) => [
            // 시간 컬럼
            <div
              key={`time-${time}`}
              className="h-8 bg-gray-50 border-r border-b flex items-center justify-center text-xs text-gray-600"
            >
              {formatTime(time)}
            </div>,

            // 각 요일별 셀
            ...weekDays.map(({ date, dateKey }) => {
              const schedule = getScheduleBlock(dateKey, time);
              const off = getOffBlock(dateKey, time);
              const isPastDate = date.isBefore(today, "day");

              return (
                <div
                  key={`${dateKey}-${time}`}
                  className={`h-8 border-r last:border-r-0 border-b flex items-center justify-center text-xs min-w-0 transition-colors ${getBlockStyle(
                    schedule,
                    off,
                    false,
                    isPastDate
                  )}`}
                  title={getTooltipText(schedule, off)}
                >
                  <span className="truncate text-xs">
                    {getBlockContent(schedule, off)}
                  </span>
                </div>
              );
            }),
          ]).flat()}
        </div>
      </div>

      {/* 범례 */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-200 border rounded"></div>
          <span>완료된 수업</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-200 border rounded"></div>
          <span>예정된 수업</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-200 border rounded"></div>
          <span>결석</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-200 border rounded"></div>
          <span>개인 휴무</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-300 border rounded"></div>
          <span>센터 정기 휴무</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-200 border rounded"></div>
          <span>센터 특별 휴무</span>
        </div>
      </div>

      {/* 로딩 상태 표시 */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">데이터를 불러오는 중...</p>
          </div>
        </div>
      )}

      {/* 모달들 */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="스케줄 조회 오류"
        message={error || "스케줄을 불러오는데 실패했습니다."}
        onConfirm={handleErrorConfirm}
      />

      <WeekLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
      />
    </div>
  );
}
