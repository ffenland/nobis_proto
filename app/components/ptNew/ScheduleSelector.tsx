// app/components/ptNew/ScheduleSelector.tsx 개선 버전
"use client";

import { useState, useRef } from "react";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
import useSWR from "swr";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IDaySchedule } from "@/app/lib/services/pt-apply.service";
import {
  addThirtyMinutes,
  formatTime,
  generateTimeSlots,
  generateClassTimeSlots,
  timeRangesOverlap,
} from "@/app/lib/utils/time.utils";

// API fetcher - 로컬에서 정의
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

interface IScheduleSelectorProps {
  trainerId: string;
  pattern: {
    regular: boolean;
    count: number;
  };
  duration: number; // 수업 시간 (시간 단위)
  chosenSchedule: IDaySchedule;
  setChosenSchedule: (schedule: IDaySchedule) => void;
  openTime?: number;
  closeTime?: number;
}

const ScheduleSelector = ({
  trainerId,
  pattern,
  duration,
  chosenSchedule,
  setChosenSchedule,
  openTime = 600,
  closeTime = 2200,
}: IScheduleSelectorProps) => {
  const today = useRef(dayjs());
  const [currentWeek, setCurrentWeek] = useState(today.current);
  const [timeError, setTimeError] = useState<string>();

  // 트레이너 스케줄 조회
  const { data: trainerSchedule, error: scheduleError } = useSWR<IDaySchedule>(
    `/api/member/trainer-schedule?trainerId=${trainerId}`,
    fetcher
  );

  // 시간 슬롯 생성 (30분 단위)
  const timeSlots = generateTimeSlots(openTime, closeTime);

  // 요일별 한글 이름
  const weekDayNames = ["일", "월", "화", "수", "목", "금", "토"];

  // 수업 시간 길이 계산 (30분 단위 슬롯들)
  const getClassTimeSlots = (startTime: number): number[] => {
    return generateClassTimeSlots(startTime, duration, openTime, closeTime);
  };

  // 주간 날짜 생성
  const getDaysOfWeek = (week: dayjs.Dayjs) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(week.day(i));
    }
    return days;
  };

  // 시간 클릭 핸들러
  const handleTimeClick = (date: dayjs.Dayjs, time: number) => {
    // 정기 스케줄이고 이미 최대 개수 선택한 경우
    if (
      pattern.regular &&
      Object.keys(chosenSchedule).length === pattern.count
    ) {
      return;
    }

    setTimeError(undefined);

    const classTimeSlots = getClassTimeSlots(time);
    if (classTimeSlots.length === 0) {
      setTimeError("해당 시간은 선택할 수 없습니다.");
      return;
    }

    // 트레이너 스케줄과 충돌 확인
    const dateKey = date.format("YYYY-MM-DD");
    const occupiedTimes = trainerSchedule?.[dateKey] || [];

    // 수업 시간 전체가 트레이너의 기존 일정과 겹치는지 확인
    const endTime = addThirtyMinutes(classTimeSlots[classTimeSlots.length - 1]);
    const hasConflict = occupiedTimes.some((occupied) =>
      timeRangesOverlap(time, endTime, occupied, addThirtyMinutes(occupied))
    );

    if (hasConflict) {
      setTimeError("해당 시간은 이미 예약되어 있습니다.");
      return;
    }

    // 기존 선택된 시간인지 확인
    const isAlreadySelected = chosenSchedule[dateKey]?.includes(time);

    if (isAlreadySelected) {
      // 선택 해제
      const updatedSchedule = { ...chosenSchedule };
      delete updatedSchedule[dateKey];
      setChosenSchedule(updatedSchedule);
    } else {
      // 새로 선택
      if (
        pattern.regular &&
        Object.keys(chosenSchedule).length >= pattern.count
      ) {
        setTimeError(
          `정기 스케줄은 최대 ${pattern.count}개까지 선택 가능합니다.`
        );
        return;
      }

      setChosenSchedule({
        ...chosenSchedule,
        [dateKey]: classTimeSlots,
      });
    }
  };

  // 시간 슬롯 상태 확인
  const getTimeSlotStatus = (date: dayjs.Dayjs, time: number) => {
    const dateKey = date.format("YYYY-MM-DD");
    const isPast =
      date.isBefore(today.current, "day") ||
      (date.isSame(today.current, "day") &&
        time < parseInt(dayjs().format("HHmm")));

    if (isPast) return "past";

    const occupiedTimes = trainerSchedule?.[dateKey] || [];
    const classTimeSlots = getClassTimeSlots(time);

    if (classTimeSlots.length === 0) return "invalid";

    const endTime = addThirtyMinutes(classTimeSlots[classTimeSlots.length - 1]);
    const isOccupied = occupiedTimes.some((occupied) =>
      timeRangesOverlap(time, endTime, occupied, addThirtyMinutes(occupied))
    );

    if (isOccupied) return "occupied";

    const isSelected = chosenSchedule[dateKey]?.includes(time);
    if (isSelected) return "selected";

    // 정기 스케줄 제약사항
    if (pattern.regular && Object.keys(chosenSchedule).length > 0) {
      const firstSelectedDate = Object.keys(chosenSchedule).sort()[0];
      const isInSameWeek = date.isSame(dayjs(firstSelectedDate), "week");
      if (!isInSameWeek) return "disabled";
    }

    return "available";
  };

  // 주 이동
  const moveWeek = (direction: "prev" | "next") => {
    const newWeek =
      direction === "prev"
        ? currentWeek.subtract(1, "week")
        : currentWeek.add(1, "week");
    setCurrentWeek(newWeek);
  };

  return (
    <div className="space-y-4">
      {/* 헤더 정보 */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {pattern.regular ? (
              <div>
                <p>
                  <span className="font-medium">정기 일정:</span> 주{" "}
                  {pattern.count}회
                </p>
                <p>
                  <span className="font-medium">수업 시간:</span> {duration}시간
                </p>
                <p className="text-xs mt-1 text-gray-500">
                  첫 수업일을 기준으로 매주 같은 요일, 같은 시간에 진행됩니다.
                </p>
              </div>
            ) : (
              <div>
                <p>
                  <span className="font-medium">수시 일정:</span> 원하는 날짜
                  선택
                </p>
                <p>
                  <span className="font-medium">수업 시간:</span> {duration}시간
                </p>
                <p className="text-xs mt-1 text-gray-500">
                  최소 2개 날짜 선택 후, 나머지는 결제 완료 후 추가 예약
                  가능합니다.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        {Object.keys(chosenSchedule).length > 0 ? (
          <p className="text-sm text-blue-700">
            <span className="font-medium">첫 수업일:</span>{" "}
            {dayjs(Object.keys(chosenSchedule).sort()[0]).format(
              "YYYY년 MM월 DD일"
            )}
          </p>
        ) : pattern.regular ? (
          <p className="text-sm text-blue-700">
            우선 처음 수업할 날짜를 선택해 주세요. 선택한 시간대를 다시 누르면
            취소할 수 있습니다. 시간은 30분 단위로만 선택 가능합니다.
          </p>
        ) : (
          <div className="text-sm text-blue-700">
            <p>최소 2개의 날짜를 선택해주세요.</p>
            <p>시간은 30분 단위로만 선택 가능합니다.</p>
          </div>
        )}
      </div>

      {/* 에러 메시지 */}
      {timeError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{timeError}</p>
        </div>
      )}

      {/* 주간 네비게이션 */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => moveWeek("prev")}
          disabled={
            currentWeek.isSame(today.current, "week") ||
            currentWeek.isBefore(today.current, "week")
          }
        >
          <ChevronLeft className="w-4 h-4" />
          이전 주
        </Button>
        <h3 className="font-medium">
          {currentWeek.format("YYYY년 MM월")} {currentWeek.week()}주차
        </h3>
        <Button variant="outline" size="sm" onClick={() => moveWeek("next")}>
          다음 주
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-200 rounded"></div>
          <span>선택된 시간 (✓)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-200 rounded"></div>
          <span>예약 불가 (×)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-200 rounded"></div>
          <span>선택 불가</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-white border rounded"></div>
          <span>선택 가능</span>
        </div>
      </div>

      {/* 선택된 스케줄 요약 */}
      {Object.keys(chosenSchedule).length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            선택된 일정
          </h4>
          <div className="space-y-1">
            {Object.keys(chosenSchedule)
              .sort()
              .map((dateKey) => {
                const times = chosenSchedule[dateKey];
                const startTime = times[0];
                const endTime = addThirtyMinutes(times[times.length - 1]);
                const date = dayjs(dateKey);

                return (
                  <div
                    key={dateKey}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {date.format("MM월 DD일")} ({weekDayNames[date.day()]})
                    </span>
                    <Badge variant="success">
                      {formatTime(startTime)} - {formatTime(endTime)}
                    </Badge>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 주간 달력 그리드 */}
      <div className="grid grid-cols-8 gap-1">
        {/* 시간 헤더 컬럼 */}
        <div className="border rounded-lg overflow-hidden">
          <div className="p-2 text-center text-xs font-medium bg-gray-50 text-gray-600 h-[48px] flex items-center justify-center">
            시간
          </div>
          {/* 시간 표시 */}
          <div className="space-y-px">
            {timeSlots.map((time, timeIndex) => (
              <div
                key={time}
                className="h-6 flex items-center justify-center text-xs text-gray-500 bg-gray-50 border-r"
              >
                {timeIndex % 2 === 0 && formatTime(time)}
              </div>
            ))}
          </div>
        </div>

        {/* 요일별 컬럼들 */}
        {getDaysOfWeek(currentWeek).map((day, dayIndex) => {
          const isToday = day.isSame(today.current, "day");
          const isPast = day.isBefore(today.current, "day");
          const dateKey = day.format("YYYY-MM-DD");

          // 정기 스케줄 제약사항
          const cannotChoose =
            pattern.regular && Object.keys(chosenSchedule).length > 0
              ? day.isBefore(dayjs(Object.keys(chosenSchedule).sort()[0])) ||
                day.isSameOrAfter(
                  dayjs(Object.keys(chosenSchedule).sort()[0]).add(1, "weeks")
                )
              : false;

          return (
            <div key={dateKey} className="border rounded-lg overflow-hidden">
              {/* 날짜 헤더 */}
              <div
                className={`p-2 text-center text-xs font-medium h-[48px] flex flex-col items-center justify-center ${
                  isToday
                    ? "bg-blue-100 text-blue-800"
                    : isPast
                    ? "bg-gray-100 text-gray-400"
                    : "bg-gray-50 text-gray-600"
                }`}
              >
                <div>{weekDayNames[dayIndex]}</div>
                <div className="text-lg">{day.format("D")}</div>
              </div>

              {/* 시간 슬롯들 */}
              <div className="space-y-px">
                {timeSlots.map((time) => {
                  const status = getTimeSlotStatus(day, time);

                  const slotClasses = {
                    past: "bg-gray-100 cursor-not-allowed",
                    occupied: "bg-red-200 cursor-not-allowed",
                    invalid: "bg-gray-200 cursor-not-allowed",
                    disabled: "bg-gray-200 cursor-not-allowed",
                    selected: "bg-green-200 cursor-pointer",
                    available:
                      "bg-white hover:bg-blue-50 cursor-pointer border",
                  };

                  const slotIcons = {
                    past: "",
                    occupied: "×",
                    invalid: "",
                    disabled: "",
                    selected: "✓",
                    available: "",
                  };

                  return (
                    <div
                      key={time}
                      className={`h-6 flex items-center justify-center text-xs ${slotClasses[status]}`}
                      onClick={() => {
                        if (status === "available" || status === "selected") {
                          handleTimeClick(day, time);
                        }
                      }}
                    >
                      {slotIcons[status]}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScheduleSelector;
