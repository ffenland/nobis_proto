// components/ptNew/ConfirmationStep.tsx
"use client";

import { useState } from "react";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Textarea } from "@/app/components/ui/Input";
import { ErrorMessage, Badge } from "@/app/components/ui/Loading";
import {
  IFitnessCenters,
  IPtProgramsByCenter,
  IDaySchedule,
} from "@/app/lib/services/pt-apply.service";
import {
  ISchedulePattern,
  convertRegularScheduleToSlots,
  IScheduleValidationData,
  IScheduleSlot,
} from "@/app/lib/services/schedule.service";
import { formatTime, addThirtyMinutes } from "./schedule.utils";
import { formatDateWithWeekday } from "@/app/lib/utils/time.utils";

interface ConfirmationStepProps {
  selectedCenter: IFitnessCenters[number];
  selectedPt: IPtProgramsByCenter[number];
  selectedTrainer: IPtProgramsByCenter[number]["trainer"][number];
  pattern: ISchedulePattern;
  chosenSchedule: IDaySchedule;
  message: string;
  setMessage: (message: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const ConfirmationStep = ({
  selectedCenter,
  selectedPt,
  selectedTrainer,
  pattern,
  chosenSchedule,
  message,
  setMessage,
  onSubmit,
  isSubmitting,
}: ConfirmationStepProps) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] =
    useState<IScheduleValidationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 스케줄 검증
  const handleValidateSchedule = async () => {
    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch("/api/member/validate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainerId: selectedTrainer.id,
          chosenSchedule,
          pattern,
          totalCount: selectedPt.totalCount,
        }),
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

  // 검증 결과 리셋
  const resetValidation = () => {
    setValidationResult(null);
    setError(null);
  };

  // 스케줄 검증 결과 렌더링
  const renderValidationResult = () => {
    if (!validationResult) return null;

    const formatScheduleSlot = (slot: IScheduleSlot) => {
      const date = new Date(slot.date);
      const thisYear = new Date().getFullYear();
      const year = date.getFullYear() === thisYear ? null : date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const weekDay = date.getDay();
      const weekDayNames = ["일", "월", "화", "수", "목", "금", "토"];

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
            <Button variant="outline" className="flex-1" onClick={resetValidation}>
              다시 선택하기
            </Button>
            <Button variant="primary" className="flex-1" onClick={onSubmit}>
              신청하기
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // 스케줄 검증 결과가 있으면 결과 표시
  if (validationResult) {
    return renderValidationResult();
  }

  // 검증 에러가 있으면 에러 표시
  if (error) {
    return (
      <div className="space-y-4">
        <ErrorMessage message={error} />
        <Button onClick={resetValidation} variant="outline" className="w-full">
          다시 시도
        </Button>
      </div>
    );
  }

  // 스케줄 표시 계산
  const getScheduleDisplay = () => {
    if (pattern.regular) {
      // 정기 수업: schedule.service의 함수 사용
      const calculatedSchedules = convertRegularScheduleToSlots(
        chosenSchedule,
        selectedPt.totalCount
      );

      return calculatedSchedules
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((schedule) => (
          <div
            key={`${schedule.date.toISOString()}-${schedule.startTime}`}
            className="text-sm"
          >
            {formatDateWithWeekday(schedule.date)}{" "}
            {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
          </div>
        ));
    } else {
      // 비정기 수업: 연속된 시간대를 하나의 범위로 표시
      return Object.entries(chosenSchedule)
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .map(([date, times]) => {
          if (times.length === 0) return null;

          const startTime = times[0];
          const endTime = addThirtyMinutes(times[times.length - 1]);
          const dateObj = new Date(date);

          return (
            <div key={date} className="text-sm">
              {formatDateWithWeekday(dateObj)} {formatTime(startTime)} -{" "}
              {formatTime(endTime)}
            </div>
          );
        });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center text-gray-600 mb-6">
        <p>신청 내용을 확인하고 최종 신청해주세요.</p>
      </div>

      {/* 신청 요약 */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">신청 요약</h3>

          <div className="space-y-4">
            <div>
              <span className="text-sm text-gray-600">헬스장</span>
              <div className="font-medium">{selectedCenter.title}</div>
            </div>

            <div>
              <span className="text-sm text-gray-600">PT 프로그램</span>
              <div className="font-medium">{selectedPt.title}</div>
              <div className="text-sm text-gray-600">
                총 {selectedPt.totalCount}회 • 회당 {selectedPt.time}시간 •{" "}
                {selectedPt.price.toLocaleString()}원
              </div>
            </div>

            <div>
              <span className="text-sm text-gray-600">담당 트레이너</span>
              <div className="font-medium">{selectedTrainer.user.username}</div>
            </div>

            <div>
              <span className="text-sm text-gray-600">수업 방식</span>
              <div className="font-medium">
                {pattern.regular
                  ? `정기 수업 (주 ${pattern.count}회)`
                  : "비정기 수업"}
              </div>
            </div>

            <div>
              <span className="text-sm text-gray-600">수업 일정</span>
              <div className="space-y-1 mt-1 max-h-60 overflow-y-auto">
                {getScheduleDisplay()}
              </div>
              {pattern.regular && (
                <div className="text-xs text-gray-500 mt-2">
                  * 트레이너 휴무일은 자동으로 건너뛰어 계산됩니다.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 메시지 입력 */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium text-gray-900 mb-3">
            트레이너에게 한마디
          </h3>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="운동 목표나 요청사항을 적어주세요 (선택사항)"
            rows={3}
          />
        </CardContent>
      </Card>

      {/* 스케줄 검증 및 신청 버튼 */}
      <Button
        onClick={handleValidateSchedule}
        disabled={isValidating || isSubmitting}
        className="w-full"
        size="lg"
      >
        {isValidating ? "스케줄 확인 중..." : "스케줄 확인 및 신청"}
      </Button>
    </div>
  );
};

export default ConfirmationStep;
