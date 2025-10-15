"use client";

import { useState, useCallback, useEffect } from "react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { format, addDays, startOfToday } from "date-fns";
import { ko } from "date-fns/locale";
import { Button } from "@/app/components/ui/Button";
import { Card, CardContent } from "@/app/components/ui/Card";
import { CalendarDays, Clock, AlertCircle } from "lucide-react";
import {
  formatTime,
  generateTimeSlots,
  filterFutureTimeSlots,
  type TimeInt,
} from "@/app/lib/utils/time.utils";

// 스케줄 체크 결과 타입
interface ScheduleCheckResult {
  conflicts: {
    id: string;
    startTime: string;
    endTime: string;
    memberName: string;
  }[];
  isAvailable: boolean;
  message: string;
}

interface DateSelectionStepProps {
  selectedProduct: {
    id?: string; // Optional since ptDetail.ptProduct doesn't include it
    title: string;
    time: number;
    totalCount: number;
  };
  onNext: (
    startDate: Date,
    firstLessonScheduledAt: string,
    firstLessonEndAt: string,
    memo: string
  ) => void;
  onBack: () => void;
}

const DateSelectionStep = ({
  selectedProduct,
  onNext,
  onBack,
}: DateSelectionStepProps) => {
  // 오늘부터 30일 이내만 선택 가능
  const today = startOfToday();
  const maxDate = addDays(today, 30);

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [startTime, setStartTime] = useState<TimeInt | null>(null);
  const [endTime, setEndTime] = useState<TimeInt | null>(null);
  const [memo, setMemo] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // 스케줄 체크 관련 상태
  const [error, setError] = useState<string | null>(null);
  const [scheduleCheckLoading, setScheduleCheckLoading] = useState(false);
  const [scheduleCheckResult, setScheduleCheckResult] =
    useState<ScheduleCheckResult | null>(null);

  // 시간 슬롯 생성 (9:00 ~ 22:00, 30분 단위)
  const allTimeSlots = generateTimeSlots(900, 2200);

  // 선택된 날짜에 따라 과거 시간 필터링
  const timeSlots =
    selectedDate &&
    selectedDate instanceof Date &&
    !isNaN(selectedDate.getTime())
      ? filterFutureTimeSlots(allTimeSlots, format(selectedDate, "yyyy-MM-dd"))
      : allTimeSlots;

  // 스케줄 체크 함수
  const checkSchedule = useCallback(
    async (date: string, start: number, end: number) => {
      if (!date || !start || !end) return;

      setScheduleCheckLoading(true);
      setError(null);
      setScheduleCheckResult(null);

      try {
        // 날짜와 시간을 조합하여 ISO 문자열 생성
        const startHour = Math.floor(start / 100);
        const startMinute = start % 100;
        const endHour = Math.floor(end / 100);
        const endMinute = end % 100;

        const scheduledAt = new Date(
          `${date}T${startHour.toString().padStart(2, "0")}:${startMinute
            .toString()
            .padStart(2, "0")}:00`
        );
        const endAt = new Date(
          `${date}T${endHour.toString().padStart(2, "0")}:${endMinute
            .toString()
            .padStart(2, "0")}:00`
        );

        const response = await fetch(
          `/api/trainer/lesson/schedule-check?scheduledAt=${scheduledAt.toISOString()}&endAt=${endAt.toISOString()}`
        );

        if (!response.ok) {
          throw new Error("스케줄 체크 요청이 실패했습니다.");
        }

        const result = await response.json();
        setScheduleCheckResult(result);

        // 충돌이 있는 경우 에러 메시지 설정
        if (!result.isAvailable && result.conflicts.length > 0) {
          const conflict = result.conflicts[0];
          setError(
            `선택하신 날짜에 ${conflict.startTime}부터 ${conflict.endTime}까지 ${conflict.memberName}님과의 수업이 있습니다.`
          );
        }
      } catch (error) {
        console.error("스케줄 체크 실패:", error);
        setError("스케줄 체크 중 오류가 발생했습니다.");
      } finally {
        setScheduleCheckLoading(false);
      }
    },
    []
  );

  // 시작 시간 변경 시 종료 시간 자동 계산
  const handleStartTimeChange = (time: TimeInt) => {
    setStartTime(time);

    // PT 상품의 세션 시간 기본값으로 자동 설정
    const sessionMinutes = selectedProduct.time || 60;

    const startHour = Math.floor(time / 100);
    const startMinute = time % 100;
    const startTotalMinutes = startHour * 60 + startMinute;

    // 세션 시간만큼 더해서 종료 시간 계산
    const endTotalMinutes = startTotalMinutes + sessionMinutes;
    const endHour = Math.floor(endTotalMinutes / 60);
    const endMinute = endTotalMinutes % 60;
    const calculatedEndTime = endHour * 100 + endMinute;

    // 22:30까지만 가능
    const finalEndTime = calculatedEndTime <= 2230 ? calculatedEndTime : 2230;
    setEndTime(finalEndTime as TimeInt);
  };

  // 자동 스케줄 체크 - 날짜와 시간이 모두 선택되었을 때 실행
  useEffect(() => {
    if (selectedDate && startTime && endTime) {
      const dateString = format(selectedDate, "yyyy-MM-dd");
      checkSchedule(dateString, startTime, endTime);
    }
  }, [selectedDate, startTime, endTime, checkSchedule]);

  const handleSubmit = async () => {
    if (!startTime || !endTime) {
      alert("수업 시간을 선택해주세요.");
      return;
    }

    // 스케줄 충돌이 있으면 제출 차단
    if (scheduleCheckResult && !scheduleCheckResult.isAvailable) {
      alert("선택하신 시간에 다른 수업이 있습니다. 다른 시간을 선택해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      // 선택된 날짜와 시간을 조합하여 DateTime 생성
      const startHour = Math.floor(startTime / 100);
      const startMinute = startTime % 100;
      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(startHour, startMinute, 0, 0);

      // 종료 시간 설정
      const endHour = Math.floor(endTime / 100);
      const endMinute = endTime % 100;
      const endAt = new Date(selectedDate);
      endAt.setHours(endHour, endMinute, 0, 0);

      // PT 시작일은 선택된 날짜
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);

      onNext(
        startDate,
        scheduledAt.toISOString(),
        endAt.toISOString(),
        memo.trim()
      );
    } catch (error) {
      console.error("날짜 선택 중 오류:", error);
      alert("날짜 선택 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 비활성화할 날짜 조건 함수
  const isDateDisabled = (date: Date) => {
    return date < today || date > maxDate;
  };

  // 기본 클래스명 가져오기
  const defaultClassNames = getDefaultClassNames();

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* 첫 수업 일정 선택 안내 */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />첫 수업 일정 선택
              </h3>
              <p className="text-sm text-gray-600">
                첫 번째 PT 수업 날짜와 시간을 선택해주세요. 오늘부터 30일 이내의
                날짜를 선택할 수 있습니다.
              </p>
            </div>

            {/* 달력 */}
            <div className="w-full">
              <div className="border rounded-lg p-6 bg-white shadow-sm">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    console.log("날짜 선택됨:", date);
                    if (date) {
                      setSelectedDate(date);
                      // 날짜가 변경되면 시간 초기화
                      setStartTime(null);
                      setEndTime(null);
                    }
                  }}
                  disabled={isDateDisabled}
                  locale={ko}
                  showOutsideDays={false}
                  classNames={{
                    root: `${defaultClassNames.root} w-full relative`,
                    months: "w-full",
                    month: "w-full space-y-4",
                    month_caption:
                      "flex justify-center relative items-start mb-4 px-20",
                    caption_label: "md:text-lg font-semibold text-gray-900",
                    nav: "z-10 flex justify-between w-full absolute top-0 left-0 right-0",
                    nav_button:
                      "w-1/4 py-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors flex items-center justify-center",
                    nav_button_previous: "absolute left-0 top-0",
                    nav_button_next: "absolute right-0 top-0",
                    month_grid: "w-full",
                    weekdays: "grid grid-cols-7 text-center mb-2",
                    weekday: "text-sm font-medium text-gray-600 p-2",
                    weeks: "w-full",
                    week: "grid grid-cols-7 w-full",
                    day: "relative p-0 w-full aspect-square rounded-lg flex items-center justify-center",
                    day_button:
                      "w-full h-full rounded-lg border-2 border-transparent hover:bg-blue-400 hover:text-white transition-colors flex items-center justify-center text-base font-medium cursor-pointer",
                    selected:
                      "bg-blue-500 text-white hover:bg-blue-600 font-semibold",
                    today: "bg-gray-100 font-bold text-gray-900",
                    outside: "text-gray-400 opacity-50",
                    disabled:
                      "text-gray-300 opacity-50 cursor-not-allowed hover:bg-transparent",
                    hidden: "invisible",
                    range_start: "bg-blue-500 text-white rounded-l-lg",
                    range_end: "bg-blue-500 text-white rounded-r-lg",
                    range_middle: "bg-blue-100",
                    chevron: `${defaultClassNames.chevron} w-7 h-7 fill-gray-600`,
                  }}
                />
              </div>
            </div>

            {/* 시간 선택 */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Clock className="w-4 h-4" />
                수업 시작 시간 <span className="text-red-500">*</span>
              </label>
              <select
                value={startTime || ""}
                onChange={(e) =>
                  handleStartTimeChange(Number(e.target.value) as TimeInt)
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">시간을 선택하세요</option>
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {formatTime(slot)}
                  </option>
                ))}
              </select>
              {startTime && endTime && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-500">
                    수업 종료 시간: {formatTime(endTime)} (수업 시간:{" "}
                    {selectedProduct.time}분)
                  </p>
                  {scheduleCheckLoading && (
                    <p className="text-sm text-blue-600 flex items-center gap-1">
                      <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></span>
                      스케줄 확인 중...
                    </p>
                  )}
                  {scheduleCheckResult && scheduleCheckResult.isAvailable && (
                    <p className="text-sm text-green-600">
                      ✓ 선택하신 시간에 수업 가능합니다
                    </p>
                  )}
                  {error && <p className="text-sm text-red-600">⚠ {error}</p>}
                </div>
              )}
            </div>

            {/* 메모 입력 */}
            {startTime && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  첫 수업 메모 (선택사항)
                </label>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="첫 수업에 대한 특별한 내용이나 준비사항을 입력해주세요."
                  maxLength={300}
                />
                <div className="text-xs text-gray-500 text-right">
                  {memo.length}/300
                </div>
              </div>
            )}

            {/* 선택된 날짜/시간 표시 */}
            {startTime && endTime && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      선택하신 첫 수업 일정
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedDate &&
                      selectedDate instanceof Date &&
                      !isNaN(selectedDate.getTime())
                        ? format(selectedDate, "yyyy년 M월 d일 (EEEE)", {
                            locale: ko,
                          })
                        : "날짜 선택"}{" "}
                      {formatTime(startTime)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      수업 시간: {selectedProduct.time}분 (
                      {formatTime(startTime)} ~ {formatTime(endTime)})
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 안내 메시지 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm text-yellow-800 font-medium">
                    첫 수업 일정 안내
                  </p>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    <li>• 선택하신 일정으로 첫 번째 PT 수업이 예약됩니다.</li>
                    <li>
                      • 수업 종료 시간은 PT 상품의 수업 시간(
                      {selectedProduct.time}분)으로 자동 계산됩니다.
                    </li>
                    <li>
                      • 추후 다른 수업 일정은 별도로 협의하여 정할 수 있습니다.
                    </li>
                    <li>• 스케줄 충돌이 있는 경우 다른 시간을 선택해주세요.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 버튼 */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline" disabled={isLoading}>
          이전 단계
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            !startTime ||
            isLoading ||
            scheduleCheckLoading ||
            scheduleCheckResult?.isAvailable === false
          }
          className="min-w-[120px]"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              처리 중...
            </span>
          ) : scheduleCheckLoading ? (
            "스케줄 확인 중..."
          ) : scheduleCheckResult && !scheduleCheckResult.isAvailable ? (
            "시간 충돌"
          ) : (
            "Pt 승인 완료"
          )}
        </Button>
      </div>
    </div>
  );
};

export default DateSelectionStep;
