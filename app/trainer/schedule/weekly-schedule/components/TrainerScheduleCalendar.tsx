"use client";

import React, { useState, useCallback, useMemo } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";
import weekday from "dayjs/plugin/weekday";

import { getWeekDayMapData } from "@/app/lib/utils";
import { formatTime } from "@/app/lib/utils/time.utils";
import type {
  ITrainerScheduleResponse,
  IPtTimeSlot,
  IOffTimeSlot,
  ITimeRange,
  ITrainerWorkingHour,
} from "@/app/lib/services/trainer-schedule.service";
// import { WeekDay } from "@prisma/client";

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(weekday);
dayjs.locale("ko");

// WeekDay enum을 숫자로 변환
// function weekDayToNumber(weekDay: WeekDay): number {
//   switch (weekDay) {
//     case WeekDay.SUN:
//       return 0;
//     case WeekDay.MON:
//       return 1;
//     case WeekDay.TUE:
//       return 2;
//     case WeekDay.WED:
//       return 3;
//     case WeekDay.THU:
//       return 4;
//     case WeekDay.FRI:
//       return 5;
//     case WeekDay.SAT:
//       return 6;
//     default:
//       return -1;
//   }
// }

// WeekDay 문자열을 숫자로 변환
function weekDayStringToNumber(weekDay: string): number {
  const dayMap: { [key: string]: number } = {
    "SUN": 0,
    "MON": 1,
    "TUE": 2,
    "WED": 3,
    "THU": 4,
    "FRI": 5,
    "SAT": 6,
  };
  return dayMap[weekDay] ?? -1;
}

// 특정 요일의 근무시간 정보 반환
function getWorkingHoursForDay(
  dayOfWeek: number,
  workingHours: ITrainerWorkingHour[]
): ITrainerWorkingHour | undefined {
  return workingHours.find(wh => weekDayStringToNumber(wh.dayOfWeek) === dayOfWeek);
}

// 특정 시간이 해당 요일의 근무시간인지 확인
function isWorkingTime(
  dayOfWeek: number,
  time: number,
  workingHours: ITrainerWorkingHour[]
): boolean {
  const dayWorkingHours = getWorkingHoursForDay(dayOfWeek, workingHours);
  if (!dayWorkingHours || (dayWorkingHours.openTime === 0 && dayWorkingHours.closeTime === 0)) {
    return false; // 휴무일
  }
  return time >= dayWorkingHours.openTime && time <= dayWorkingHours.closeTime;
}

// 요일이 완전 휴무일인지 확인
function isFullOffDay(
  dayOfWeek: number,
  workingHours: ITrainerWorkingHour[]
): boolean {
  const dayWorkingHours = getWorkingHoursForDay(dayOfWeek, workingHours);
  return !dayWorkingHours || (dayWorkingHours.openTime === 0 && dayWorkingHours.closeTime === 0);
}

interface ITrainerScheduleCalendarProps {
  scheduleData: ITrainerScheduleResponse;
  isLoading?: boolean;
  onWeekChange?: (startDate: string, endDate: string) => void;
}

// 동적 TIME_SLOTS 생성 함수
const generateTimeSlots = (timeRange: ITimeRange): number[] => {
  const slots: number[] = [];
  const startHour = Math.floor(timeRange.startTime / 100);
  const startMinute = timeRange.startTime % 100;
  const endHour = Math.floor(timeRange.endTime / 100);
  const endMinute = timeRange.endTime % 100;

  let currentTime = startHour * 100 + startMinute;
  const endTime = endHour * 100 + endMinute;

  while (currentTime <= endTime) {
    slots.push(currentTime);
    
    // 30분 증가
    const hour = Math.floor(currentTime / 100);
    const minute = currentTime % 100;
    
    if (minute === 0) {
      currentTime = hour * 100 + 30;
    } else {
      currentTime = (hour + 1) * 100;
    }
  }

  return slots;
};

export function TrainerScheduleCalendar({
  scheduleData,
  isLoading = false,
  onWeekChange,
}: ITrainerScheduleCalendarProps) {
  // 동적 TIME_SLOTS 생성
  const TIME_SLOTS = useMemo(() => {
    return generateTimeSlots(scheduleData.timeRange);
  }, [scheduleData.timeRange]);

  // 상태 관리
  const [currentWeek, setCurrentWeek] = useState(() => {
    const today = dayjs();
    return today.startOf("week").add(1, "day"); // 월요일
  });

  const today = dayjs();

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

  // 주 이동 핸들러
  const handlePrevWeek = useCallback(() => {
    const prevWeek = currentWeek.subtract(1, "week");
    setCurrentWeek(prevWeek);

    if (onWeekChange) {
      const startDate = prevWeek.format("YYYY-MM-DD");
      const endDate = prevWeek.add(6, "day").format("YYYY-MM-DD");
      onWeekChange(startDate, endDate);
    }
  }, [currentWeek, onWeekChange]);

  const handleNextWeek = useCallback(() => {
    const nextWeek = currentWeek.add(1, "week");
    setCurrentWeek(nextWeek);

    if (onWeekChange) {
      const startDate = nextWeek.format("YYYY-MM-DD");
      const endDate = nextWeek.add(6, "day").format("YYYY-MM-DD");
      onWeekChange(startDate, endDate);
    }
  }, [currentWeek, onWeekChange]);

  // 특정 날짜, 시간의 PT 스케줄 찾기
  const getPtSlot = useCallback(
    (dateKey: string, time: number): IPtTimeSlot | undefined => {
      const dayData = scheduleData.scheduleData[dateKey];
      if (!dayData) return undefined;

      return dayData.pt.find((pt) => pt.startTime <= time && pt.endTime > time);
    },
    [scheduleData.scheduleData]
  );

  // 특정 날짜, 시간의 오프 스케줄 찾기
  const getOffSlot = useCallback(
    (dateKey: string, time: number): IOffTimeSlot | undefined => {
      const dayData = scheduleData.scheduleData[dateKey];
      if (!dayData) return undefined;

      return dayData.off.find(
        (off) => off.startTime <= time && off.endTime > time
      );
    },
    [scheduleData.scheduleData]
  );

  // 스케줄 블록 스타일링
  const getBlockStyle = useCallback(
    (
      ptSlot: IPtTimeSlot | undefined,
      offSlot: IOffTimeSlot | undefined,
      isTimeColumn: boolean,
      isPastDate: boolean,
      dayOfWeek: number,
      time: number
    ) => {
      // PT 스케줄이 있는 경우 (최우선)
      if (ptSlot) {
        switch (ptSlot.status) {
          case "ATTENDED":
            return "bg-green-200 text-green-900 font-bold";
          case "ABSENT":
            return "bg-red-200 text-red-900 font-bold";
          case "RESERVED":
            return "bg-blue-200 text-blue-900 font-bold";
          case "PENDING":
            return "bg-yellow-200 text-yellow-900 font-bold";
          default:
            return "bg-gray-200 text-gray-900";
        }
      }

      // OFF 스케줄이 있는 경우
      if (offSlot) {
        switch (offSlot.type) {
          case "TRAINER_OFF":
            return "bg-purple-800 text-white font-bold";
          case "CENTER_REGULAR_OFF":
          case "CENTER_SPECIAL_OFF":
            return "bg-gray-700 text-white font-bold";
          default:
            return "bg-gray-700 text-white font-bold";
        }
      }

      // 시간 컬럼인 경우
      if (isTimeColumn) return "bg-gray-100";

      // 과거 날짜인 경우
      if (isPastDate) return "bg-gray-100";

      // 완전 휴무일인 경우 (진한 회색)
      if (isFullOffDay(dayOfWeek, scheduleData.workingHours)) {
        return "bg-gray-700 text-white";
      }

      // 근무시간 외인 경우 (연한 회색)
      if (!isWorkingTime(dayOfWeek, time, scheduleData.workingHours)) {
        return "bg-gray-400 text-gray-700";
      }

      // 정상 근무시간인 경우
      return "bg-white hover:bg-gray-50";
    },
    [scheduleData.workingHours]
  );

  // 블록 내용 텍스트 (2글자로 제한)
  const getBlockContent = useCallback(
    (
      ptSlot: IPtTimeSlot | undefined,
      offSlot: IOffTimeSlot | undefined
    ): string => {
      if (ptSlot) {
        // PT 일정이 있으면 PT 상태를 2글자로 표시
        switch (ptSlot.status) {
          case "ATTENDED":
            return "완료";
          case "ABSENT":
            return "결석";
          case "RESERVED":
            return "예약";
          case "PENDING":
            return "대기";
          default:
            return "PT";
        }
      }

      if (offSlot) {
        // PT 일정이 없을 때만 오프 텍스트 표시
        switch (offSlot.type) {
          case "TRAINER_OFF":
            return "휴가";
          case "CENTER_REGULAR_OFF":
          case "CENTER_SPECIAL_OFF":
            return "휴무";
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
      ptSlot: IPtTimeSlot | undefined,
      offSlot: IOffTimeSlot | undefined,
      dayOfWeek: number,
      time: number
    ): string => {
      if (ptSlot) {
        const statusText = {
          ATTENDED: "완료",
          ABSENT: "결석",
          RESERVED: "예정",
          PENDING: "대기",
        }[ptSlot.status];
        return `${statusText}`;
      }

      if (offSlot) {
        const typeText = {
          TRAINER_OFF: "개인 휴무",
          CENTER_REGULAR_OFF: "센터 정기 휴무",
          CENTER_SPECIAL_OFF: "센터 특별 휴무",
        }[offSlot.type];

        return offSlot.description
          ? `${typeText}: ${offSlot.description}`
          : typeText;
      }

      // 완전 휴무일인 경우
      if (isFullOffDay(dayOfWeek, scheduleData.workingHours)) {
        return "휴무일";
      }

      // 근무시간 외인 경우
      if (!isWorkingTime(dayOfWeek, time, scheduleData.workingHours)) {
        return "근무시간 외";
      }

      return "";
    },
    [scheduleData.workingHours]
  );

  // 네비게이션 가능 여부 확인 (과거 3개월, 미래 6개월까지 허용)
  const canGoPrev = currentWeek.isAfter(
    today.subtract(3, "month").startOf("week").add(1, "day")
  );
  const canGoNext = currentWeek.isBefore(
    today.add(6, "month").startOf("week").add(1, "day")
  );

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
              const ptSlot = getPtSlot(dateKey, time);
              const offSlot = getOffSlot(dateKey, time);
              const isPastDate = date.isBefore(today, "day");
              const dayOfWeek = date.day(); // 0=일요일, 1=월요일 ...

              return (
                <div
                  key={`${dateKey}-${time}`}
                  className={`h-8 border-r last:border-r-0 border-b flex items-center justify-center text-xs min-w-0 transition-colors ${getBlockStyle(
                    ptSlot,
                    offSlot,
                    false,
                    isPastDate,
                    dayOfWeek,
                    time
                  )}`}
                  title={getTooltipText(ptSlot, offSlot, dayOfWeek, time)}
                >
                  <span className="truncate text-xs">
                    {getBlockContent(ptSlot, offSlot)}
                  </span>
                </div>
              );
            }),
          ]).flat()}
        </div>
      </div>

      {/* 범례 */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-200 border rounded"></div>
          <span>완료된 수업</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-200 border rounded"></div>
          <span>예정된 수업</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-200 border rounded"></div>
          <span>신청 대기중</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-200 border rounded"></div>
          <span>결석</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-800 border rounded"></div>
          <span>개인 휴가</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-700 border rounded"></div>
          <span>센터 휴무</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-700 border rounded"></div>
          <span>휴무일</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-400 border rounded"></div>
          <span>근무시간 외</span>
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
    </div>
  );
}
