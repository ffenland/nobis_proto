// components/ptNew/ScheduleSelectionStep.tsx
"use client";

import { useState } from "react";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import ScheduleSelector from "@/app/components/ptNew/ScheduleSelector";
import { ScheduleConfirmModal } from "@/app/components/schedule/scheduleValidation";
import {
  IPtProgramsByCenter,
  IDaySchedule,
} from "@/app/lib/services/pt-apply.service";
import { ISchedulePattern } from "@/app/lib/services/schedule.service";

interface ScheduleSelectionStepProps {
  selectedPt: IPtProgramsByCenter[number];
  selectedTrainer: IPtProgramsByCenter[number]["trainer"][number];
  pattern: ISchedulePattern;
  setPattern: (pattern: ISchedulePattern) => void;
  chosenSchedule: IDaySchedule;
  setChosenSchedule: (schedule: IDaySchedule) => void;
  onNext: () => void;
}

export const ScheduleSelectionStep = ({
  selectedPt,
  selectedTrainer,
  pattern,
  setPattern,
  chosenSchedule,
  setChosenSchedule,
  onNext,
}: ScheduleSelectionStepProps) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 정기/비정기 변경 시 스케줄 초기화
  const handlePatternChange = (regular: boolean) => {
    setPattern({
      regular,
      count: regular ? 2 : selectedPt.totalCount, // 정기는 주 2회 기본, 비정기는 총 횟수
    });
    setChosenSchedule({});
  };

  // 스케줄 유효성 검사
  const isScheduleValid = () => {
    const scheduleCount = Object.keys(chosenSchedule).length;
    if (pattern.regular) {
      return scheduleCount === pattern.count; // 정기: 정확히 주간 횟수만큼
    } else {
      return scheduleCount >= 2; // 비정기: 최소 2개 이상
    }
  };

  const handleNext = () => {
    if (isScheduleValid()) {
      setShowConfirmModal(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center text-gray-600 mb-6">
        <p>수업 방식과 스케줄을 선택해주세요.</p>
      </div>

      {/* 정기/비정기 선택 */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium text-gray-900 mb-3">수업 방식</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handlePatternChange(true)}
              className={`p-3 border rounded-lg text-center transition-all ${
                pattern.regular
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-medium text-gray-900">정기 수업</div>
              <div className="text-sm text-gray-600">
                매주 같은 요일/시간에 진행
              </div>
            </button>
            <button
              onClick={() => handlePatternChange(false)}
              className={`p-3 border rounded-lg text-center transition-all ${
                !pattern.regular
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-medium text-gray-900">비정기 수업</div>
              <div className="text-sm text-gray-600">
                원하는 날짜/시간을 개별 선택
              </div>
            </button>
          </div>

          {/* 정기 수업 횟수 선택 */}
          {pattern.regular && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                주간 수업 횟수
              </label>
              <select
                value={pattern.count}
                onChange={(e) =>
                  setPattern({ ...pattern, count: Number(e.target.value) })
                }
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value={1}>주 1회</option>
                <option value={2}>주 2회</option>
                <option value={3}>주 3회</option>
                <option value={4}>주 4회</option>
                <option value={5}>주 5회</option>
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 스케줄 선택기 */}
      <ScheduleSelector
        trainerId={selectedTrainer.id}
        pattern={pattern}
        duration={selectedPt.time}
        chosenSchedule={chosenSchedule}
        setChosenSchedule={setChosenSchedule}
      />

      {/* 다음 버튼 */}
      <div className="pt-4">
        <Button
          onClick={handleNext}
          disabled={!isScheduleValid()}
          className="w-full"
        >
          {isScheduleValid()
            ? "다음 단계"
            : pattern.regular
            ? `주 ${pattern.count}회 일정을 모두 선택해주세요`
            : "최소 2개 날짜를 선택해주세요"}
        </Button>
      </div>

      {/* 확인 모달 */}
      {showConfirmModal && (
        <ScheduleConfirmModal
          ptName={selectedPt.title}
          trainerName={selectedTrainer.user.username}
          chosenSchedule={chosenSchedule}
          pattern={pattern}
          duration={selectedPt.time}
          onConfirm={() => {
            setShowConfirmModal(false);
            onNext();
          }}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
    </div>
  );
};
