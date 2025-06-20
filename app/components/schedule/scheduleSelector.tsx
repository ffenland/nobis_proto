"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isoWeek from "dayjs/plugin/isoWeek";
import weekday from "dayjs/plugin/weekday";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import {
  IDaySchedule,
  ISchedulePattern,
} from "@/app/lib/services/schedule.service";

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(weekday);
dayjs.extend(isSameOrAfter);
dayjs.locale("ko");

// API fetcher
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

interface IScheduleSelectorProps {
  trainerId: string;
  pattern: ISchedulePattern;
  duration: number;
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

  // 시간 슬롯 조회
  const { data: timeSlotsData } = useSWR<{ timeSlots: number[] }>(
    `/api/member/time-slots?openTime=${openTime}&closeTime=${closeTime}`,
    fetcher
  );

  const timeSlots = timeSlotsData?.timeSlots || [];

  // 요일별 한글 이름
  const weekDayNames = ["일", "월", "화", "수", "목", "금", "토"];

  // 시간 포맷 (HHMM -> HH:MM)
  const formatTime = (time: number) => {
    const hour = Math.floor(time / 100);
    const minute = time % 100;
    return `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
  };

  // 30분 추가
  const addThirtyMinutes = (time: number) => {
    const hour = Math.floor(time / 100);
    const minute = time % 100;

    if (minute === 30) {
      return (hour + 1) * 100;
    } else {
      return time + 30;
    }
  };

  // 시간 길이 계산
  const getTimeLength = (startTime: number): number[] => {
    const timeLength: number[] = [];
    let currentTime = startTime;

    for (let i = 0; i < Math.floor(duration / 0.5); i++) {
      if (currentTime >= closeTime || currentTime < openTime) {
        break;
      }
      timeLength.push(currentTime);
      currentTime = addThirtyMinutes(currentTime);
    }

    return timeLength;
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

    const timeLength = getTimeLength(time);
    if (timeLength.length === 0) {
      setTimeError("해당 시간은 선택할 수 없습니다.");
      return;
    }

    // 트레이너 스케줄과 충돌 확인
    const dateKey = date.format("YYYY-MM-DD");
    const occupiedTimes = trainerSchedule?.[dateKey] || [];

    const hasConflict = timeLength.some((t) => occupiedTimes.includes(t));
    if (hasConflict) {
      return;
    }

    const newSchedule = { ...chosenSchedule };
    newSchedule[dateKey] = [...timeLength];
    setChosenSchedule(newSchedule);
  };

  // 선택된 시간 클릭 (취소)
  const handleChosenTimeClick = (date: dayjs.Dayjs) => {
    const dateKey = date.format("YYYY-MM-DD");
    const newSchedule = { ...chosenSchedule };
    delete newSchedule[dateKey];
    setChosenSchedule(newSchedule);
  };

  // 이전 주
  const handlePrevWeek = () => {
    const minAllowedDate =
      pattern.regular && Object.keys(chosenSchedule).length > 0
        ? dayjs(Object.keys(chosenSchedule).sort()[0]).startOf("week")
        : today.current.startOf("week");

    const newWeek = currentWeek.subtract(1, "week");
    if (newWeek.isSameOrAfter(minAllowedDate, "week")) {
      setCurrentWeek(newWeek);
    }
  };

  // 다음 주
  const handleNextWeek = () => {
    let maxAllowedDate = today.current.add(12, "weeks").endOf("week");

    if (pattern.regular && Object.keys(chosenSchedule).length > 0) {
      const firstSelectedDate = dayjs(Object.keys(chosenSchedule).sort()[0]);
      maxAllowedDate = firstSelectedDate.add(1, "week");
    }

    const newWeek = currentWeek.add(1, "week");
    if (
      newWeek.isBefore(maxAllowedDate) ||
      newWeek.isSame(maxAllowedDate, "week")
    ) {
      setCurrentWeek(newWeek);
    }
  };

  // 초기 주 설정
  useEffect(() => {
    const currentDay = today.current;
    const nextMonday =
      currentDay.day() === 0
        ? currentDay.add(1, "day")
        : currentDay.startOf("isoWeek");
    setCurrentWeek(nextMonday);
  }, []);

  if (scheduleError) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-600">스케줄을 불러올 수 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={handlePrevWeek}>
            ← 이전 주
          </Button>
          <h3 className="font-medium text-gray-900">
            {currentWeek.add(1, "day").format("YYYY년 MM월")}
          </h3>
          <Button variant="outline" size="sm" onClick={handleNextWeek}>
            다음 주 →
          </Button>
        </div>

        {/* 에러 메시지 */}
        {timeError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{timeError}</p>
          </div>
        )}

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
              취소할 수 있습니다.
            </p>
          ) : (
            <div className="text-sm text-blue-700">
              <p>최소 2개의 날짜를 선택해주세요.</p>
              <p>그 이후의 일정은 나중에 선택할 수 있습니다.</p>
            </div>
          )}
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
        <div className="grid grid-cols-7 gap-1">
          {getDaysOfWeek(currentWeek).map((day, dayIndex) => {
            const isToday = day.isSame(today.current, "day");
            const isPast = day.isBefore(today.current, "day");
            const dateKey = day.format("YYYY-MM-DD");

            // 트레이너가 예약된 시간들
            const occupiedTimes = trainerSchedule?.[dateKey] || [];
            // 사용자가 선택한 시간들
            const chosenTimes = chosenSchedule[dateKey] || [];

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
                  className={`p-2 text-center text-xs font-medium ${
                    dayIndex === 0 ? "invisible" : ""
                  } ${
                    isToday
                      ? "bg-blue-100 text-blue-700"
                      : dayIndex === 6
                      ? "bg-blue-50 text-blue-600"
                      : "bg-gray-50 text-gray-600"
                  }`}
                >
                  {dayIndex !== 0 && (
                    <>
                      <div>{weekDayNames[day.weekday()]}</div>
                      <div className="font-bold">{day.date()}일</div>
                    </>
                  )}
                </div>

                {/* 시간 슬롯들 */}
                <div className="space-y-px">
                  {timeSlots.map((time, timeIndex) => {
                    const isOccupied = occupiedTimes.includes(time);
                    const isChosen = chosenTimes.includes(time);

                    // 일요일 컬럼은 시간 표시용
                    if (dayIndex === 0) {
                      return (
                        <div
                          key={time}
                          className="h-6 flex items-center justify-center text-xs text-gray-500 bg-gray-50 border-r"
                        >
                          {timeIndex % 2 === 0 && formatTime(time)}
                        </div>
                      );
                    }

                    const isLastSlot = timeIndex === timeSlots.length - 1;

                    return (
                      <div
                        key={time}
                        className={`h-6 flex items-center justify-center text-xs cursor-pointer transition-colors ${
                          isPast || cannotChoose || isLastSlot
                            ? "bg-gray-200 cursor-not-allowed"
                            : isOccupied
                            ? "bg-red-200 text-red-700 cursor-not-allowed"
                            : isChosen
                            ? "bg-green-200 text-green-700 hover:bg-green-300"
                            : "bg-white hover:bg-gray-100 border"
                        }`}
                        onClick={() => {
                          if (
                            isPast ||
                            cannotChoose ||
                            isLastSlot ||
                            isOccupied
                          )
                            return;

                          if (isChosen) {
                            handleChosenTimeClick(day);
                          } else {
                            handleTimeClick(day, time);
                          }
                        }}
                      >
                        {isOccupied && "예약됨"}
                        {isChosen && "선택됨"}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 범례 */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-200 rounded"></div>
            <span>선택된 시간</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-200 rounded"></div>
            <span>예약 불가</span>
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

        {/* 하단 정보 */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
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
      </CardContent>
    </Card>
  );
};

export default ScheduleSelector;
