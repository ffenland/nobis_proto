// app/trainer/schedule/off/components/TrainerWorkingHourManager.tsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { WeekDay } from "@prisma/client";
import { Button } from "@/app/components/ui/Button";
import { LoadingSpinner } from "@/app/components/ui/Loading";

// 요일 매핑
const WEEKDAY_LABELS: Record<WeekDay, string> = {
  [WeekDay.MON]: "월요일",
  [WeekDay.TUE]: "화요일", 
  [WeekDay.WED]: "수요일",
  [WeekDay.THU]: "목요일",
  [WeekDay.FRI]: "금요일",
  [WeekDay.SAT]: "토요일",
  [WeekDay.SUN]: "일요일",
};

// 근무시간 스키마
const workingHourSchema = z.object({
  dayOfWeek: z.nativeEnum(WeekDay, {
    required_error: "요일을 선택해주세요.",
  }),
  startTime: z.number().min(0).max(23),
  endTime: z.number().min(1).max(24),
}).refine((data) => data.startTime < data.endTime, {
  message: "종료 시간은 시작 시간보다 늦어야 합니다.",
});

type WorkingHourForm = z.infer<typeof workingHourSchema>;

interface WorkingHour {
  id: string;
  dayOfWeek: WeekDay;
  startTime: number;
  endTime: number;
  createdAt: string;
}

interface TrainerWorkingHourManagerProps {
  onSuccess: () => void;
  onError: (message: string) => void;
}

export default function TrainerWorkingHourManager({ onSuccess, onError }: TrainerWorkingHourManagerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<WorkingHourForm>({
    resolver: zodResolver(workingHourSchema),
    mode: "onChange",
    defaultValues: {
      startTime: 9,
      endTime: 18,
    },
  });

  // 근무시간 목록 로드
  const loadWorkingHours = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/trainer/working-hours");
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "근무시간을 불러올 수 없습니다.");
      }

      const { data } = await response.json();
      setWorkingHours(data);
    } catch (error) {
      onError(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkingHours();
  }, []);

  const onSubmit = async (data: WorkingHourForm) => {
    try {
      setIsSubmitting(true);

      const response = await fetch("/api/trainer/working-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "근무시간 등록에 실패했습니다.");
      }

      reset();
      await loadWorkingHours(); // 목록 새로고침
      onSuccess();
    } catch (error) {
      onError(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 근무시간 삭제
  const handleDelete = async (workingHourId: string) => {
    if (!confirm("이 근무시간을 삭제하시겠습니까?")) {
      return;
    }

    try {
      const response = await fetch(`/api/trainer/working-hours/${workingHourId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "근무시간 삭제에 실패했습니다.");
      }

      await loadWorkingHours(); // 목록 새로고침
      onSuccess();
    } catch (error) {
      onError(error instanceof Error ? error.message : "삭제 중 오류가 발생했습니다.");
    }
  };

  // 시간 포맷팅
  const formatTime = (hour: number) => {
    return `${hour.toString().padStart(2, "0")}:00`;
  };

  // 요일별로 그룹화
  const groupedByDay = workingHours.reduce((acc, hour) => {
    if (!acc[hour.dayOfWeek]) {
      acc[hour.dayOfWeek] = [];
    }
    acc[hour.dayOfWeek].push(hour);
    return acc;
  }, {} as Record<WeekDay, WorkingHour[]>);

  return (
    <div className="space-y-6">
      {/* 새 근무시간 추가 폼 */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 요일 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            요일 선택 *
          </label>
          <select
            {...register("dayOfWeek")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          >
            <option value="">요일을 선택하세요</option>
            {Object.values(WeekDay).map((value) => (
              <option key={value} value={value}>
                {WEEKDAY_LABELS[value]}
              </option>
            ))}
          </select>
          {errors.dayOfWeek && (
            <p className="text-xs text-red-600 mt-1">{errors.dayOfWeek.message}</p>
          )}
        </div>

        {/* 시간 설정 */}
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
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {formatTime(i)}
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
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {formatTime(i + 1)}
                </option>
              ))}
            </select>
          </div>
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
            "근무시간 추가"
          )}
        </Button>
      </form>

      {/* 기존 근무시간 목록 */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          등록된 근무시간
        </h3>
        
        {isLoading ? (
          <div className="flex justify-center py-4">
            <LoadingSpinner size="sm" />
          </div>
        ) : workingHours.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            등록된 근무시간이 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {Object.values(WeekDay).map((day) => {
              const dayHours = groupedByDay[day] || [];
              if (dayHours.length === 0) return null;

              return (
                <div key={day} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">
                    {WEEKDAY_LABELS[day]}
                  </h4>
                  <div className="space-y-2">
                    {dayHours
                      .sort((a, b) => a.startTime - b.startTime)
                      .map((hour) => (
                        <div
                          key={hour.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                        >
                          <span className="text-sm text-gray-700">
                            {formatTime(hour.startTime)} ~ {formatTime(hour.endTime)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(hour.id)}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            삭제
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}