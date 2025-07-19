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
import {
  IDaySchedule,
  IFitnessCenters,
  ITrainerSchedule,
} from "@/app/lib/services/pt-apply.service";
import {
  addThirtyMinutes,
  formatTime,
  formatTimeSimple,
  generateTimeSlots,
  generateClassTimeSlots,
  timeRangesOverlap,
  subtractMinutes,
} from "@/app/lib/utils/time.utils";
import { WeekDay } from "@prisma/client";

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
  duration: number; // 수업 시간 (분 단위)
  chosenSchedule: IDaySchedule;
  setChosenSchedule: (schedule: IDaySchedule) => void;
  openingHours: {
    dayOfWeek: WeekDay;
    openTime: number;
    closeTime: number;
    isClosed: boolean;
  }[];
}

const ScheduleSelector = ({
  trainerId,
  pattern,
  duration,
  chosenSchedule,
  setChosenSchedule,
  openingHours,
}: IScheduleSelectorProps) => {
  const today = useRef(dayjs());
  const [currentWeek, setCurrentWeek] = useState(today.current);
  const [timeError, setTimeError] = useState<string>();

  // 트레이너 스케줄 조회
  const { data: trainerSchedule, error: scheduleError } =
    useSWR<ITrainerSchedule>(
      `/api/member/trainer-schedule?trainerId=${trainerId}`,
      fetcher
    );

  // 요일별 영업시간 확인 함수
  const getOpeningHoursForDay = (dayOfWeek: number) => {
    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const dayName = dayNames[dayOfWeek];
    return openingHours.find((oh) => oh.dayOfWeek === dayName);
  };

  // 전체 시간 슬롯 생성 (가장 이른 시간부터 가장 늦은 시간까지)
  const globalOpenTime =
    openingHours.length > 0
      ? Math.min(
          ...openingHours.filter((oh) => !oh.isClosed).map((oh) => oh.openTime)
        )
      : 600;
  const globalCloseTime =
    openingHours.length > 0
      ? Math.max(
          ...openingHours.filter((oh) => !oh.isClosed).map((oh) => oh.closeTime)
        )
      : 2200;

  const timeSlots = generateTimeSlots(globalOpenTime, globalCloseTime);

  // 요일별 한글 이름
  const weekDayNames = ["일", "월", "화", "수", "목", "금", "토"];

  // 수업 시간 길이 계산 (30분 단위 슬롯들)
  const getClassTimeSlots = (startTime: number): number[] => {
    return generateClassTimeSlots(
      startTime,
      duration,
      globalOpenTime,
      globalCloseTime
    );
  };

  // 주간 날짜 생성
  const getDaysOfWeek = (week: dayjs.Dayjs) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(week.day(i));
    }
    return days;
  };

  // 첫 수업일 계산 헬퍼 함수
  const getFirstScheduleDate = (schedule: IDaySchedule): dayjs.Dayjs | null => {
    const dates = Object.keys(schedule).sort();
    return dates.length > 0 ? dayjs(dates[0]) : null;
  };

  // 시간 클릭 핸들러
  const handleTimeClick = (date: dayjs.Dayjs, time: number) => {
    setTimeError(undefined);
    const dateKey = date.format("YYYY-MM-DD");

    // 1. 시간 슬롯 상태 확인
    const status = getTimeSlotStatus(date, time);
    if (status !== "available" && status !== "selected") {
      setTimeError("해당 시간은 선택할 수 없습니다.");
      return;
    }

    // 2. 이미 선택된 시간 슬롯 클릭 시 (삭제)
    const isAlreadySelected = chosenSchedule[dateKey]?.includes(time);
    if (isAlreadySelected) {
      const updatedSchedule = { ...chosenSchedule };
      delete updatedSchedule[dateKey];
      setChosenSchedule(updatedSchedule);
      return;
    }

    // 3. 수업 시간 슬롯 계산
    const classTimeSlots = getClassTimeSlots(time);
    if (classTimeSlots.length === 0) {
      setTimeError("수업 시간을 계산할 수 없습니다.");
      return;
    }

    // 4. 전체 수업 시간 범위와 트레이너 일정 충돌 확인
    const startTime = classTimeSlots[0];
    const endTime = addThirtyMinutes(classTimeSlots[classTimeSlots.length - 1]);
    const currentDate = date.format("YYYY-MM-DD");

    // 트레이너 기존 스케줄과 충돌 확인
    if (trainerSchedule?.existingSchedules) {
      const hasConflict = trainerSchedule.existingSchedules.some((schedule) => {
        const scheduleDate = dayjs(schedule.date).format("YYYY-MM-DD");
        if (scheduleDate !== currentDate) return false;

        return timeRangesOverlap(
          startTime,
          endTime,
          schedule.startTime,
          schedule.endTime
        );
      });

      if (hasConflict) {
        setTimeError("선택한 시간이 트레이너의 다른 수업과 겹칩니다.");
        return;
      }
    }

    // 트레이너 OFF 일정과 충돌 확인
    if (trainerSchedule?.trainerOffs) {
      const hasOffConflict = trainerSchedule.trainerOffs.some((off) => {
        const offDate = dayjs(off.date).format("YYYY-MM-DD");
        if (offDate !== currentDate) return false;

        return timeRangesOverlap(
          startTime,
          endTime,
          off.startTime,
          off.endTime
        );
      });

      if (hasOffConflict) {
        setTimeError("선택한 시간이 트레이너의 휴무 시간과 겹칩니다.");
        return;
      }
    }

    // 트레이너 반복 OFF 일정과 충돌 확인 (현재 삭제됨)

    // 5. 스케줄 업데이트
    setChosenSchedule({
      ...chosenSchedule,
      [dateKey]: classTimeSlots,
    });
  };

  // 시간 슬롯 상태 확인
  const getTimeSlotStatus = (date: dayjs.Dayjs, time: number) => {
    const dateKey = date.format("YYYY-MM-DD");

    // 1. 과거 시간 체크 (오늘 포함하여 과거로 처리)
    const isPast =
      date.isBefore(today.current, "day") || date.isSame(today.current, "day");
    if (isPast) return "past";

    // 2. 영업시간 확인
    const dayOpeningHours = getOpeningHoursForDay(date.day());
    if (!dayOpeningHours || dayOpeningHours.isClosed) return "closed";

    // 3. 영업시간 내 시간인지 확인
    if (time < dayOpeningHours.openTime) {
      return "closed";
    }

    // 4. 선택된 수업 범위 내 시간인지 확인 (우선순위 높음)
    const selectedTimes = chosenSchedule[dateKey];
    if (selectedTimes && selectedTimes.length > 0) {
      const startTime = selectedTimes[0];
      const endTime = addThirtyMinutes(selectedTimes[selectedTimes.length - 1]);

      // 선택된 시작 시간이면 selected 상태
      if (time === startTime) return "selected";

      // 선택된 수업 범위 내 시간이면 in_class_range 상태
      if (time > startTime && time < endTime) {
        return "in_class_range";
      }
    }

    // 5. 수업 시작 가능 시간 확인 (duration 고려)
    const maxStartTime = subtractMinutes(dayOpeningHours.closeTime, duration);
    if (time > maxStartTime) {
      return "cannot_start";
    }

    // 6. 트레이너 스케줄 충돌 확인
    if (trainerSchedule?.existingSchedules) {
      const classTimeSlots = getClassTimeSlots(time);
      if (classTimeSlots.length === 0) return "invalid";

      const endTime = classTimeSlots[classTimeSlots.length - 1];
      const currentDate = date.format("YYYY-MM-DD");

      // 해당 날짜의 트레이너 기존 스케줄 확인
      const isOccupied = trainerSchedule.existingSchedules.some((schedule) => {
        const scheduleDate = dayjs(schedule.date).format("YYYY-MM-DD");
        if (scheduleDate !== currentDate) return false;

        return timeRangesOverlap(
          time,
          endTime,
          schedule.startTime,
          schedule.endTime
        );
      });

      if (isOccupied) return "occupied";
    }

    // 7. 트레이너 OFF 일정 확인
    if (trainerSchedule?.trainerOffs) {
      const classTimeSlots = getClassTimeSlots(time);
      if (classTimeSlots.length === 0) return "invalid";

      const endTime = addThirtyMinutes(
        classTimeSlots[classTimeSlots.length - 1]
      );
      const currentDate = date.format("YYYY-MM-DD");

      // 특정 날짜 OFF 확인
      if (trainerSchedule.trainerOffs) {
        const isOffDay = trainerSchedule.trainerOffs.some((off) => {
          const offDate = dayjs(off.date).format("YYYY-MM-DD");
          if (offDate !== currentDate) return false;

          return timeRangesOverlap(time, endTime, off.startTime, off.endTime);
        });

        if (isOffDay) return "occupied";
      }
    }

    // 8. 첫 수업일 기준 제약사항
    const currentFirstDate = getFirstScheduleDate(chosenSchedule);

    if (currentFirstDate) {
      // 8-1. 첫 수업일보다 과거 날짜 차단
      if (date.isBefore(currentFirstDate, "day")) {
        return "disabled";
      }

      // 8-2. Regular 패턴의 7일 제한
      if (pattern.regular) {
        const weekLater = currentFirstDate.add(7, "days");
        if (date.isAfter(weekLater, "day") || date.isSame(weekLater, "day")) {
          return "disabled";
        }
      }
    }

    // 9. 새로운 날짜 추가 시 최대 개수 제한 (Regular 패턴)
    const isNewDate = !chosenSchedule[dateKey];
    if (
      pattern.regular &&
      isNewDate &&
      Object.keys(chosenSchedule).length >= pattern.count
    ) {
      return "disabled";
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
    <div className="space-y-2 sm:space-y-4">
      {/* 헤더 정보 */}
      <div className="bg-white border rounded-lg p-3 sm:p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {pattern.regular ? (
              <div>
                <p>
                  <span className="font-medium">정기 일정:</span> 주{" "}
                  {pattern.count}회
                </p>
                <p>
                  <span className="font-medium">수업 시간:</span> {duration}분
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
                  <span className="font-medium">수업 시간:</span> {duration}분
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
      <div className="mb-2 sm:mb-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
        {Object.keys(chosenSchedule).length > 0 ? (
          <p className="text-sm text-blue-700">
            <span className="font-medium">첫 수업일:</span>{" "}
            {dayjs(Object.keys(chosenSchedule).sort()[0]).format(
              "YYYY년 MM월 DD일"
            )}
          </p>
        ) : pattern.regular ? (
          <p className="text-sm text-blue-700">
            원하는 날짜의 수업 시작시간을 선택하세요. 처음 선택하는 시간이 첫
            수업일이 됩니다. 시간을 다시 누르면 취소할 수 있습니다. 시간은 30분
            단위로만 선택 가능합니다.
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
        <div className="p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
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
          className="px-2"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="font-medium">
          {currentWeek.format("YYYY년 MM월")} {currentWeek.week()}주차
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => moveWeek("next")}
          className="px-2"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap gap-2 sm:gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-200 rounded"></div>
          <span>선택된 시간 (✓)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-100 rounded"></div>
          <span>수업 시간</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-200 rounded"></div>
          <span>예약 불가 (×)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-400 rounded"></div>
          <span>수업 시작 불가</span>
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
      <div
        className="grid gap-px sm:gap-1"
        style={{ gridTemplateColumns: "40px repeat(7, 1fr)" }}
      >
        {/* 시간 헤더 컬럼 */}
        <div className="border rounded-lg overflow-hidden">
          <div className="p-2 text-center text-xs font-medium bg-gray-50 text-gray-600 h-[48px] flex items-center justify-center">
            시간
          </div>
          {/* 시간 표시 */}
          <div className="space-y-px">
            {timeSlots.map((time) => (
              <div
                key={time}
                className="h-6 flex items-center justify-center text-xs text-gray-500 bg-gray-50 border-r"
              >
                {formatTimeSimple(time)}
              </div>
            ))}
          </div>
        </div>

        {/* 요일별 컬럼들 */}
        {getDaysOfWeek(currentWeek).map((day, dayIndex) => {
          const isToday = day.isSame(today.current, "day");
          const isPast = day.isBefore(today.current, "day");
          const dateKey = day.format("YYYY-MM-DD");

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
                    past: "bg-gray-200 cursor-not-allowed",
                    occupied: "bg-red-200 cursor-not-allowed",
                    invalid: "bg-gray-200 cursor-not-allowed",
                    disabled: "bg-gray-200 cursor-not-allowed",
                    closed: "bg-gray-300 cursor-not-allowed",
                    cannot_start: "bg-gray-400 cursor-not-allowed",
                    selected: "bg-green-200 cursor-pointer",
                    in_class_range: "bg-green-100 cursor-not-allowed",
                    available:
                      "bg-white hover:bg-blue-50 cursor-pointer border",
                  };

                  const slotIcons = {
                    past: "",
                    occupied: "×",
                    invalid: "",
                    disabled: "",
                    closed: "",
                    cannot_start: "",
                    selected: "✓",
                    in_class_range: "",
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
