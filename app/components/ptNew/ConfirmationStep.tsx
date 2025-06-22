// components/ptNew/ConfirmationStep.tsx
"use client";

import useSWR from "swr";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Textarea } from "@/app/components/ui/Input";
import { ErrorMessage } from "@/app/components/ui/Loading";
import {
  ScheduleValidationResult,
  useScheduleValidation,
} from "@/app/components/schedule/scheduleValidation";
import {
  IFitnessCenters,
  IPtProgramsByCenter,
  IDaySchedule,
} from "@/app/lib/services/pt-apply.service";
import { ISchedulePattern } from "@/app/lib/services/schedule.service";
import {
  calculateRegularScheduleDates,
  formatTime,
  addThirtyMinutes,
} from "./scheduleUtils";

// API fetcher
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

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

export const ConfirmationStep = ({
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
  const {
    isValidating,
    validationResult,
    error,
    validateSchedule,
    resetValidation,
  } = useScheduleValidation();

  // 트레이너 off 스케줄 조회
  const { data: trainerOffs } = useSWR<
    Array<{ date: string; startTime?: number; endTime?: number }>
  >(`/api/member/trainer-offs?trainerId=${selectedTrainer.id}`, fetcher);

  // 스케줄 검증
  const handleValidateSchedule = async () => {
    await validateSchedule({
      trainerId: selectedTrainer.id,
      chosenSchedule,
      pattern,
      totalCount: selectedPt.totalCount,
    });
  };

  // 스케줄 검증 결과가 있으면 결과 표시
  if (validationResult) {
    return (
      <ScheduleValidationResult
        validationResult={validationResult}
        onConfirm={onSubmit}
        onReset={resetValidation}
      />
    );
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
      // 정기 수업: 실제 날짜 계산
      const calculatedSchedules = calculateRegularScheduleDates(
        chosenSchedule,
        selectedPt.totalCount,
        trainerOffs || []
      );

      return calculatedSchedules.map((schedule) => (
        <div key={`${schedule.date}-${schedule.startTime}`} className="text-sm">
          {new Date(schedule.date).toLocaleDateString("ko-KR")}{" "}
          {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
        </div>
      ));
    } else {
      // 비정기 수업: 기존 방식
      return Object.entries(chosenSchedule).map(([date, times]) =>
        times.map((time) => (
          <div key={`${date}-${time}`} className="text-sm">
            {new Date(date).toLocaleDateString("ko-KR")} {formatTime(time)} -{" "}
            {formatTime(addThirtyMinutes(time))}
          </div>
        ))
      );
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
