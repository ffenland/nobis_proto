// components/ptNew/ScheduleSelectionStep.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import ScheduleSelector from "@/app/member/pt/new/components/ScheduleSelector";

import {
  IPtProgramsByCenter,
  IDaySchedule,
  IFitnessCenters,
} from "@/app/lib/services/pt-apply.service";
import { ISchedulePattern } from "@/app/lib/services/schedule.service";
import { WeekDay } from "@prisma/client";
import { Badge } from "@/app/components/ui/Loading";
import dayjs from "dayjs";

interface ScheduleSelectionStepProps {
  selectedCenter?: IFitnessCenters[number] | null;
  selectedPt: IPtProgramsByCenter[number];
  selectedTrainer: IPtProgramsByCenter[number]["trainer"][number];
  pattern: ISchedulePattern;
  setPattern: (pattern: ISchedulePattern) => void;
  chosenSchedule: IDaySchedule;
  setChosenSchedule: (schedule: IDaySchedule) => void;
  onNext: () => void;
}

const pTAvailableTimes = [
  {
    dayOfWeek: WeekDay.MON,
    openTime: 900,
    closeTime: 2100,
    isClosed: false,
  },
  {
    dayOfWeek: WeekDay.TUE,
    openTime: 900,
    closeTime: 2100,
    isClosed: false,
  },
  {
    dayOfWeek: WeekDay.WED,
    openTime: 900,
    closeTime: 2100,
    isClosed: false,
  },
  {
    dayOfWeek: WeekDay.THU,
    openTime: 900,
    closeTime: 2100,
    isClosed: false,
  },
  {
    dayOfWeek: WeekDay.FRI,
    openTime: 900,
    closeTime: 2100,
    isClosed: false,
  },
  {
    dayOfWeek: WeekDay.SAT,
    openTime: 900,
    closeTime: 1400,
    isClosed: false,
  },
  {
    dayOfWeek: WeekDay.SUN,
    openTime: 0,
    closeTime: 0,
    isClosed: true,
  },
];

// 스케줄 확인 모달 컴포넌트
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

const ScheduleConfirmModal = ({
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
                  {dayjs(sortedKeys[0]).format("YYYY년 M월 D일")}
                </p>
                <p className="font-bold text-green-600">
                  {formatTime(chosenSchedule[sortedKeys[0]][0])} ~ {formatTime(addThirtyMinutes(chosenSchedule[sortedKeys[0]][chosenSchedule[sortedKeys[0]].length - 1]))}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {sortedKeys.map((key, index) => {
                  const times = chosenSchedule[key];
                  const startTime = times[0];
                  const endTime = addThirtyMinutes(times[times.length - 1]);
                  const date = dayjs(key);

                  return (
                    <div key={key} className="bg-blue-100 rounded-lg p-3">
                      <p className="font-bold text-gray-700 text-sm">
                        {index + 1}일차
                      </p>
                      <p>{date.format("YYYY년 M월 D일")}</p>
                      <p className="font-bold">
                        {formatTime(startTime)} ~ {formatTime(endTime)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {sortedKeys.length < pattern.count && (
                <div className="bg-gray-200 rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-700">
                    이후 일정은 결제승인 완료 후 지정하실 수 있습니다.
                  </p>
                </div>
              )}
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

const ScheduleSelectionStep = ({
  selectedPt,
  selectedTrainer,
  pattern,
  setPattern,
  chosenSchedule,
  setChosenSchedule,
  onNext,
}: ScheduleSelectionStepProps) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [canProceedEarly, setCanProceedEarly] = useState(false);

  // 비정기 패턴에서 2개 이상 선택 감지
  useEffect(() => {
    if (!pattern.regular) {
      const scheduleCount = Object.keys(chosenSchedule).length;
      setCanProceedEarly(scheduleCount >= 2);
    } else {
      setCanProceedEarly(false);
    }
  }, [chosenSchedule, pattern.regular]);

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
        openingHours={pTAvailableTimes}
      />

      {/* 비정기 패턴 안내 메시지 */}
      {!pattern.regular && canProceedEarly && (
        <div className="pt-4 pb-2">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              ✅ 2개 일정을 선택했습니다. 더 추가하거나 다음 단계로 진행하세요.
              <br />
              <span className="text-xs text-green-600">
                남은 일정은 결제 완료 후 추가로 선택할 수 있습니다.
              </span>
            </p>
          </div>
        </div>
      )}

      {/* 다음 버튼 */}
      <div className="pt-4">
        <Button
          onClick={handleNext}
          disabled={!isScheduleValid()}
          className="w-full"
        >
          {isScheduleValid()
            ? !pattern.regular && canProceedEarly
              ? "다음 단계 (남은 일정은 추후 선택 가능)"
              : "다음 단계"
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

export default ScheduleSelectionStep;
