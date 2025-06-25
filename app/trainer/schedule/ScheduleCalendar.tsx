"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";
import weekday from "dayjs/plugin/weekday";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";

import { getWeekDayMapData, displayTime } from "@/app/lib/utils";
import { loadNextMonthData, loadPrevMonthData } from "./actions";
import type { IScheduleItem, IOffItem } from "./actions";

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(weekday);
dayjs.extend(isSameOrAfter);
dayjs.locale("ko");

interface IScheduleCalendarProps {
  initialCurrentDate: Date;
  initialSchedules: IScheduleItem[];
  initialOffs: IOffItem[];
  hasNextMonth: boolean;
  hasPrevMonth: boolean;
}

// 9:00 ~ 23:00, 30분 단위 (총 28개 슬롯)
const TIME_SLOTS = Array.from(
  { length: (23 - 9) * 2 + 1 },
  (_, i) => 900 + Math.floor(i / 2) * 100 + (i % 2) * 30
);

export function ScheduleCalendar({
  initialCurrentDate,
  initialSchedules,
  initialOffs,
  hasNextMonth: initialHasNext,
  hasPrevMonth: initialHasPrev,
}: IScheduleCalendarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentDate, setCurrentDate] = useState(dayjs(initialCurrentDate));
  const [schedules, setSchedules] = useState<IScheduleItem[]>(initialSchedules);
  const [offs, setOffs] = useState<IOffItem[]>(initialOffs);
  const [hasNextMonth, setHasNextMonth] = useState(initialHasNext);
  const [hasPrevMonth, setHasPrevMonth] = useState(initialHasPrev);
  const [loadedMonths, setLoadedMonths] = useState(
    new Set([currentDate.format("YYYY-MM")])
  );

  const [isPending, startTransition] = useTransition();

  const today = dayjs();

  // 월~일 요일 정보 (7일)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = currentDate.startOf("week").add(i + 1, "day"); // 월요일부터 시작
    return {
      date,
      dayInfo: getWeekDayMapData(date.toDate()),
    };
  });

  // URL 업데이트
  const updateURL = (newDate: dayjs.Dayjs) => {
    const params = new URLSearchParams(searchParams);
    params.set("week", newDate.format("YYYY-MM-DD"));
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // 이전 주로 이동
  const handlePrevWeek = async () => {
    const prevWeek = currentDate.subtract(1, "week");
    const prevMonth = prevWeek.format("YYYY-MM");

    // 3개월 이전은 불가
    if (prevWeek.isBefore(today.subtract(3, "month"))) return;

    setCurrentDate(prevWeek);
    updateURL(prevWeek);

    // 해당 월 데이터가 로드되지 않았다면 로드
    if (!loadedMonths.has(prevMonth)) {
      startTransition(async () => {
        try {
          const data = await loadPrevMonthData(prevWeek.toDate());

          setSchedules((prev) => [...data.schedules, ...prev]);
          setOffs((prev) => [...data.offs, ...prev]);
          setHasPrevMonth(data.hasPrevMonth);
          setLoadedMonths((prev) => new Set([...prev, prevMonth]));
        } catch (error) {
          console.error("이전 월 데이터 로드 실패:", error);
        }
      });
    }
  };

  // 다음 주로 이동
  const handleNextWeek = async () => {
    const nextWeek = currentDate.add(1, "week");
    const nextMonth = nextWeek.format("YYYY-MM");

    // 3개월 이후는 불가
    if (nextWeek.isAfter(today.add(3, "month"))) return;

    setCurrentDate(nextWeek);
    updateURL(nextWeek);

    // 해당 월 데이터가 로드되지 않았다면 로드
    if (!loadedMonths.has(nextMonth)) {
      startTransition(async () => {
        try {
          const data = await loadNextMonthData(nextWeek.toDate());

          setSchedules((prev) => [...prev, ...data.schedules]);
          setOffs((prev) => [...prev, ...data.offs]);
          setHasNextMonth(data.hasNextMonth);
          setLoadedMonths((prev) => new Set([...prev, nextMonth]));
        } catch (error) {
          console.error("다음 월 데이터 로드 실패:", error);
        }
      });
    }
  };

  // 특정 날짜, 시간의 PT 스케줄 찾기
  const getScheduleBlock = (
    date: dayjs.Dayjs,
    time: number
  ): IScheduleItem | undefined => {
    return schedules.find((schedule) => {
      const scheduleDate = dayjs(schedule.ptSchedule.date);
      return (
        scheduleDate.format("YYYY-MM-DD") === date.format("YYYY-MM-DD") &&
        schedule.ptSchedule.startTime <= time &&
        schedule.ptSchedule.endTime > time
      );
    });
  };

  // 특정 날짜, 시간의 오프 스케줄 찾기
  const getOffBlock = (
    date: dayjs.Dayjs,
    time: number
  ): IOffItem | undefined => {
    return offs.find((off) => {
      const offDate = dayjs(off.date);
      return (
        offDate.format("YYYY-MM-DD") === date.format("YYYY-MM-DD") &&
        off.startTime <= time &&
        off.endTime > time
      );
    });
  };

  // 스케줄 블록 스타일링
  const getBlockStyle = (
    schedule: IScheduleItem | undefined,
    off: IOffItem | undefined,
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
      }
    }

    if (isTimeColumn) return "bg-gray-100";
    if (isPastDate) return "bg-gray-100";

    return "bg-white hover:bg-gray-50";
  };

  // 블록 내용 텍스트
  const getBlockContent = (
    schedule: IScheduleItem | undefined,
    off: IOffItem | undefined
  ): string => {
    if (schedule) {
      return schedule.pt.member?.user.username ?? "PT";
    }

    if (off) {
      switch (off.type) {
        case "TRAINER_OFF":
          return "개인 OFF";
        case "CENTER_REGULAR_OFF":
          return "정기 휴무";
        case "CENTER_SPECIAL_OFF":
          return "특별 휴무";
      }
    }

    return "";
  };

  // 툴팁 텍스트 생성
  const getTooltipText = (
    schedule: IScheduleItem | undefined,
    off: IOffItem | undefined
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
  };

  const canGoPrev =
    hasPrevMonth && !currentDate.isBefore(today.subtract(3, "month"));
  const canGoNext = hasNextMonth && !currentDate.isAfter(today.add(3, "month"));

  return (
    <div className="w-full">
      {/* 네비게이션 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevWeek}
          className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isPending || !canGoPrev}
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>

        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900">
            {currentDate
              .startOf("week")
              .add(1, "day")
              .format("YYYY년 MM월 DD일")}{" "}
            -{currentDate.startOf("week").add(7, "day").format("MM월 DD일")}
          </h2>
          <p className="text-sm text-gray-500">
            {isPending && "데이터 로딩 중..."}
          </p>
        </div>

        <button
          onClick={handleNextWeek}
          className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isPending || !canGoNext}
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

          {weekDays.map(({ date, dayInfo }) => (
            <div
              key={date.format("YYYY-MM-DD")}
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
              {displayTime(time)}
            </div>,

            // 각 요일별 셀
            ...weekDays.map(({ date }) => {
              const schedule = getScheduleBlock(date, time);
              const off = getOffBlock(date, time);
              const isPastDate = date.isBefore(today, "day");

              return (
                <div
                  key={`${date.format("YYYY-MM-DD")}-${time}`}
                  className={`h-8 border-r last:border-r-0 border-b flex items-center justify-center text-xs min-w-0 ${getBlockStyle(
                    schedule,
                    off,
                    false,
                    isPastDate
                  )}`}
                  title={getTooltipText(schedule, off)}
                >
                  <span className="truncate px-1">
                    {getBlockContent(schedule, off)}
                  </span>
                </div>
              );
            }),
          ]).flat()}
        </div>
      </div>

      {/* 범례 */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-200 border"></div>
          <span>완료된 수업</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-200 border"></div>
          <span>예정된 수업</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-200 border"></div>
          <span>결석</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-200 border"></div>
          <span>개인 휴무</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-300 border"></div>
          <span>센터 정기 휴무</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-200 border"></div>
          <span>센터 특별 휴무</span>
        </div>
      </div>
    </div>
  );
}
