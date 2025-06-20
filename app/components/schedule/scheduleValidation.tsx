"use client";

import { useState } from "react";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import {
  IDaySchedule,
  ISchedulePattern,
  IScheduleValidationData,
  IScheduleSlot,
} from "@/app/lib/services/schedule.service";
import dayjs from "dayjs";

// 스케줄 확인 모달
interface IScheduleConfirmModalProps {
  ptName?: string;
  trainerName?: string;
  chosenSchedule: IDaySchedule;
  pattern: ISchedulePattern;
  duration: number;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

export const ScheduleConfirmModal = ({
  ptName,
  trainerName,
  chosenSchedule,
  pattern,
  duration,
  onConfirm,
  onCancel,
  isPending = false,
}: IScheduleConfirmModalProps) => {
  // 시간 포맷
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
    return minute === 30 ? (hour + 1) * 100 : time + 30;
  };

  // 요일 이름
  const weekDayNames = [
    "일요일",
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
  ];

  const sortedKeys = Object.keys(chosenSchedule).sort((a, b) => {
    if (pattern.regular) {
      return dayjs(a).day() - dayjs(b).day();
    }
    return a.localeCompare(b);
  });

  const firstDay = dayjs(sortedKeys[0]);
  const firstDayTimes = chosenSchedule[sortedKeys[0]];
  const firstDayStart = firstDayTimes[0];
  const firstDayEnd = addThirtyMinutes(firstDayTimes[firstDayTimes.length - 1]);

  const secondDay = sortedKeys[1] ? dayjs(sortedKeys[1]) : null;
  const secondDayTimes = secondDay ? chosenSchedule[sortedKeys[1]] : [];
  const secondDayStart = secondDayTimes[0];
  const secondDayEnd =
    secondDayTimes.length > 0
      ? addThirtyMinutes(secondDayTimes[secondDayTimes.length - 1])
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-md border-2 border-green-500">
        <CardContent className="p-6">
          {/* 헤더 정보 */}
          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">PT 프로그램</span>
              <span className="font-bold text-lg">{ptName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">트레이너</span>
              <span className="font-bold text-lg">{trainerName}</span>
            </div>
          </div>

          {/* 스케줄 정보 */}
          {pattern.regular ? (
            <div className="space-y-4">
              <div className="text-center py-2 border-b-2">
                <Badge variant="default">주 {pattern.count}회 정규일정</Badge>
              </div>

              {sortedKeys.map((key) => {
                const times = chosenSchedule[key];
                const startTime = times[0];
                const endTime = addThirtyMinutes(times[times.length - 1]);
                const date = dayjs(key);
                const weekDay = weekDayNames[date.day()];

                return (
                  <div key={key} className="flex justify-between items-center">
                    <span>{weekDay}</span>
                    <span className="font-bold">
                      {formatTime(startTime)} ~ {formatTime(endTime)}
                    </span>
                  </div>
                );
              })}

              <div className="bg-gray-100 rounded-lg p-3 mt-4">
                <p className="text-gray-600 text-sm mb-1">첫 수업일</p>
                <p className="font-medium">
                  {firstDay.format("YYYY년 M월 D일")}
                </p>
                <p className="font-bold text-green-600">
                  {formatTime(firstDayStart)} ~ {formatTime(firstDayEnd)}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-blue-100 rounded-lg p-3">
                  <p className="font-bold text-gray-700 text-sm">첫째날</p>
                  <p>{firstDay.format("YYYY년 M월 D일")}</p>
                  <p className="font-bold">
                    {formatTime(firstDayStart)} ~ {formatTime(firstDayEnd)}
                  </p>
                </div>

                {secondDay && (
                  <div className="bg-blue-100 rounded-lg p-3">
                    <p className="font-bold text-gray-700 text-sm">둘째날</p>
                    <p>{secondDay.format("YYYY년 M월 D일")}</p>
                    <p className="font-bold">
                      {formatTime(secondDayStart)} ~ {formatTime(secondDayEnd)}
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-gray-200 rounded-lg p-3 text-center">
                <p className="text-sm text-gray-700">
                  이후 일정은 결제승인 완료 후 지정하실 수 있습니다.
                </p>
              </div>
            </div>
          )}

          {/* 버튼 */}
          {isPending ? (
            <div className="mt-6 p-4 bg-gray-100 rounded-lg text-center">
              <p className="text-gray-600">스케줄 계산중...</p>
            </div>
          ) : (
            <div className="flex gap-3 mt-6">
              <Button variant="primary" className="flex-1" onClick={onConfirm}>
                네! 맞아요
              </Button>
              <Button variant="outline" className="flex-1" onClick={onCancel}>
                다시 선택할래요
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// 스케줄 검증 결과 표시
interface IScheduleValidationResultProps {
  validationResult: IScheduleValidationData;
  onConfirm: () => void;
  onReset: () => void;
}

export const ScheduleValidationResult = ({
  validationResult,
  onConfirm,
  onReset,
}: IScheduleValidationResultProps) => {
  const formatTime = (time: number) => {
    const hour = Math.floor(time / 100);
    const minute = time % 100;
    return `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
  };

  const weekDayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const thisYear = new Date().getFullYear();

  const formatScheduleSlot = (slot: IScheduleSlot) => {
    const date = new Date(slot.date);
    const year = date.getFullYear() === thisYear ? null : date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDay = date.getDay();

    return {
      dateStr: `${year ? `${year}년 ` : ""}${month}월 ${day}일`,
      weekDay: weekDayNames[weekDay],
      timeStr: `${formatTime(slot.startTime)} ~ ${formatTime(slot.endTime)}`,
      isWeekend: weekDay === 0 || weekDay === 6,
    };
  };

  return (
    <Card>
      <CardContent className="p-6">
        {/* 성공한 일정들 */}
        <div className="mb-6">
          <h3 className="font-bold text-green-600 mb-3">예약 가능한 일정</h3>
          <div className="space-y-2">
            {validationResult.success
              .sort(
                (a, b) =>
                  new Date(a.date).getTime() - new Date(b.date).getTime()
              )
              .map((slot, index) => {
                const formatted = formatScheduleSlot(slot);
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="min-w-[80px]">{formatted.dateStr}</span>
                      <Badge
                        variant={formatted.isWeekend ? "warning" : "default"}
                      >
                        {formatted.weekDay}요일
                      </Badge>
                    </div>
                    <span className="font-mono text-sm">
                      {formatted.timeStr}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* 실패한 일정들 */}
        {validationResult.fail.length > 0 && (
          <div className="mb-6">
            <h3 className="font-bold text-red-600 mb-3">불가능한 일정</h3>

            <div className="mb-3 p-3 bg-gray-100 border rounded-lg">
              <p className="text-sm text-gray-700">
                자동으로 예약되지 않은 일정은 마이페이지에서 새로 잡으실 수
                있습니다.
              </p>
            </div>

            <div className="space-y-2">
              {validationResult.fail
                .sort(
                  (a, b) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                )
                .map((slot, index) => {
                  const formatted = formatScheduleSlot(slot);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg opacity-75 line-through"
                    >
                      <div className="flex items-center gap-3">
                        <span className="min-w-[80px]">
                          {formatted.dateStr}
                        </span>
                        <Badge variant="error">{formatted.weekDay}요일</Badge>
                      </div>
                      <span className="font-mono text-sm">
                        {formatted.timeStr}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* 액션 버튼들 */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onReset}>
            다시 선택하기
          </Button>
          <Button variant="primary" className="flex-1" onClick={onConfirm}>
            신청하기
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// 스케줄 검증 훅
export const useScheduleValidation = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] =
    useState<IScheduleValidationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateSchedule = async (data: {
    trainerId: string;
    chosenSchedule: IDaySchedule;
    pattern: ISchedulePattern;
    totalCount?: number;
  }) => {
    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch("/api/member/validate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Validation failed");
      }

      if (result.success) {
        setValidationResult(result.data);
      } else {
        setError(result.error || "Validation failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsValidating(false);
    }
  };

  const resetValidation = () => {
    setValidationResult(null);
    setError(null);
  };

  return {
    isValidating,
    validationResult,
    error,
    validateSchedule,
    resetValidation,
  };
};
