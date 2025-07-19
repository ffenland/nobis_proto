// app/trainer/schedule/off/components/DayOffSelector.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DayPicker, DateRange } from "react-day-picker";
import { ko } from "date-fns/locale";
import "react-day-picker/dist/style.css";
import { Button } from "@/app/components/ui/Button";
import { LoadingSpinner } from "@/app/components/ui/Loading";

// 특정 날짜 스키마 (간단하고 명확)
const dateSchema = z.object({
  startDate: z.string().min(1, "날짜를 선택해주세요."),
  endDate: z.string().optional(),
  startTime: z.number().min(0).max(2359),
  endTime: z.number().min(0).max(2359),
}).refine((data) => {
  // 종일인 경우 (0,0) 허용
  if (data.startTime === 0 && data.endTime === 0) return true;
  // 일반적인 시간 검증
  return data.startTime < data.endTime;
}, {
  message: "종료 시간은 시작 시간보다 늦어야 합니다.",
});

type DateForm = z.infer<typeof dateSchema>;

interface DayOffSelectorProps {
  onSuccess: () => void;
  onError: (message: string) => void;
}

export default function DayOffSelector({ onSuccess, onError }: DayOffSelectorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
  const [showTimeInputs, setShowTimeInputs] = useState(false);
  const [isFullDay, setIsFullDay] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    reset,
  } = useForm<DateForm>({
    resolver: zodResolver(dateSchema),
    mode: "onChange", // 실시간 검증
    defaultValues: {
      startTime: 0,
      endTime: 0,
    },
  });

  const watchedStartTime = watch("startTime");
  const watchedEndTime = watch("endTime");

  const onSubmit = async (data: DateForm) => {
    try {
      setIsSubmitting(true);

      const payload = {
        startDate: data.startDate,
        endDate: data.endDate,
        dateType: data.endDate ? "range" : "single",
        startTime: data.startTime,
        endTime: data.endTime,
      };

      const response = await fetch("/api/trainer/schedule/off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "오프 일정 등록에 실패했습니다.");
      }

      reset();
      setSelectedRange(undefined);
      setShowTimeInputs(false);
      setIsFullDay(true);
      onSuccess();
    } catch (error) {
      onError(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 30분 단위 시간 옵션 생성 (9:00 ~ 23:30)
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 9; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeValue = hour * 100 + minute;
        const displayTime = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        options.push({ value: timeValue, label: displayTime });
      }
    }
    // 24:00 (종료시간용)
    options.push({ value: 2400, label: "24:00" });
    return options;
  };

  const timeOptions = generateTimeOptions();

  // 시간 포맷팅 (군대식 → 표시용)
  const formatTime = (militaryTime: number) => {
    if (militaryTime === 0) return "00:00";
    if (militaryTime === 2400) return "24:00";
    const hour = Math.floor(militaryTime / 100);
    const minute = militaryTime % 100;
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  };

  // 세부시간 입력 토글
  const handleTimeInputToggle = () => {
    setShowTimeInputs(true);
    setIsFullDay(false);
    // 기본값 설정 (9:00 ~ 18:00)
    setValue("startTime", 900);
    setValue("endTime", 1800);
  };

  // 종일 설정
  const handleFullDayToggle = () => {
    setShowTimeInputs(false);
    setIsFullDay(true);
    setValue("startTime", 0);
    setValue("endTime", 0);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 사용법 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="text-sm text-blue-800">
          <span className="font-medium">📅 날짜 선택 방법:</span>
          <br />
          • <strong>하루만 등록</strong>: 원하는 날짜를 한 번 클릭하세요
          <br />
          • <strong>여러 날 등록</strong>: 시작날짜를 클릭한 후, 마지막날짜를 클릭하세요
          <br />
          • <strong>기본 설정</strong>: 종일 휴무로 설정됩니다
        </div>
      </div>

      {/* 날짜 선택기 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          날짜 선택 *
        </label>
        <div className="border border-gray-300 rounded-md p-4 bg-white">
          <DayPicker
            mode="range"
            selected={selectedRange}
            onSelect={(date) => {
              setSelectedRange(date as DateRange);
              
              // 날짜 선택 처리
              if (date && (date as DateRange).from) {
                const range = date as DateRange;
                if (range.from) {
                  const startDateValue = range.from.toISOString().split("T")[0];
                  setValue("startDate", startDateValue, {
                    shouldValidate: true,
                    shouldDirty: true
                  });

                  if (range.to) {
                    const endDateValue = range.to.toISOString().split("T")[0];
                    setValue("endDate", endDateValue, {
                      shouldValidate: true,
                      shouldDirty: true
                    });
                  } else {
                    setValue("endDate", "", {
                      shouldValidate: true,
                      shouldDirty: true
                    });
                  }
                }
              } else {
                setValue("startDate", "", {
                  shouldValidate: true,
                  shouldDirty: true
                });
                setValue("endDate", "", {
                  shouldValidate: true,
                  shouldDirty: true
                });
              }
            }}
            disabled={{
              before: new Date(),
            }}
            locale={ko}
            className="rdp"
            classNames={{
              months: "flex flex-col space-y-4",
              month: "space-y-4",
              caption: "flex flex-col items-center pt-1 pb-4 space-y-2",
              caption_label: "text-sm font-medium",
              nav: "flex justify-center space-x-4",
              nav_button: "h-8 w-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors",
              nav_button_previous: "",
              nav_button_next: "",
              table: "w-full border-collapse",
              head_row: "flex mb-2",
              head_cell: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem] text-center",
              row: "flex w-full mt-1",
              cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-blue-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 rounded-md transition-colors",
              day_selected: "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white",
              day_today: "bg-gray-100 text-gray-900 font-semibold",
              day_outside: "text-gray-400 opacity-50",
              day_disabled: "text-gray-400 opacity-50",
              day_range_middle: "aria-selected:bg-blue-100 aria-selected:text-blue-900",
              day_hidden: "invisible",
            }}
          />
        </div>
        
        {/* 선택된 날짜 표시 */}
        {selectedRange?.from && (
          <div className="mt-2 text-sm text-gray-600">
            <span className="font-medium">
              {selectedRange.to ? "선택된 범위: " : "선택된 날짜: "}
            </span>
            {selectedRange.from.toLocaleDateString("ko-KR")}
            {selectedRange.to && (
              <> ~ {selectedRange.to.toLocaleDateString("ko-KR")}</>
            )}
            <span className="ml-2 text-blue-600 text-xs">
              {selectedRange.to ? "• 여러 날 등록" : "• 하루만 등록"}
            </span>
          </div>
        )}
        
        {errors.startDate && (
          <p className="text-xs text-red-600 mt-1">{errors.startDate.message}</p>
        )}
        {errors.endDate && (
          <p className="text-xs text-red-600 mt-1">{errors.endDate.message}</p>
        )}
      </div>

      {/* 시간 설정 섹션 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">휴무 시간 설정</h3>
          <div className="flex gap-2">
            {!showTimeInputs ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTimeInputToggle}
              >
                세부시간 입력
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFullDayToggle}
              >
                종일
              </Button>
            )}
          </div>
        </div>

        {/* 현재 설정 표시 */}
        <div className="p-3 bg-gray-50 rounded-lg border">
          <div className="text-sm">
            <span className="font-medium text-gray-700">현재 설정: </span>
            {isFullDay ? (
              <span className="text-green-600 font-medium">종일 휴무</span>
            ) : (
              <span className="text-blue-600 font-medium">
                {formatTime(watchedStartTime)} ~ {formatTime(watchedEndTime)}
              </span>
            )}
          </div>
        </div>

        {/* 시간 입력창 (조건부 표시) */}
        {showTimeInputs && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                시작 시간 *
              </label>
              <select
                {...register("startTime", { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                {timeOptions.slice(0, -1).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                종료 시간 *
              </label>
              <select
                {...register("endTime", { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                {timeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {errors.root && (
        <p className="text-xs text-red-600">{errors.root.message}</p>
      )}

      <Button
        type="submit"
        variant="primary"
        disabled={isSubmitting || !isValid}
      >
        {isSubmitting ? (
          <>
            <LoadingSpinner size="sm" className="mr-2" />
            등록 중...
          </>
        ) : (
          "특정 날짜 일정 추가"
        )}
      </Button>
    </form>
  );
}