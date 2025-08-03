// components/ptNew/ScheduleSelectionStep.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import ScheduleSelector from "@/app/member/pt/new/components/ScheduleSelector";
import useSWR from "swr";

import {
  IPtProgramsByCenter,
  IDaySchedule,
  IFitnessCenters,
  ITrainerSchedule,
} from "@/app/lib/services/pt-apply.service";
import { ISchedulePattern } from "@/app/lib/services/schedule.service";
import { WeekDay } from "@prisma/client";
import { Badge } from "@/app/components/ui/Loading";
import dayjs from "dayjs";
import type { IPreschedulePtResult } from "@/app/lib/services/pt-apply.service";

interface ScheduleSelectionStepProps {
  selectedCenter?: IFitnessCenters[number] | null;
  selectedPt: IPtProgramsByCenter[number];
  selectedTrainer: IPtProgramsByCenter[number]["trainer"][number];
  pattern: ISchedulePattern;
  setPattern: (pattern: ISchedulePattern) => void;
  chosenSchedule: IDaySchedule;
  setChosenSchedule: (schedule: IDaySchedule) => void;
  onNext: (result: IPreschedulePtResult) => void;
}

// 데이터 페처 함수
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("데이터를 불러오는데 실패했습니다");
  }
  return response.json();
};

// 트레이너 근무시간을 ScheduleSelector 형식으로 변환
const convertWorkingHoursToOpeningHours = (
  workingHours: ITrainerSchedule["workingHours"]
) => {
  return workingHours.map((wh) => ({
    dayOfWeek: wh.dayOfWeek as WeekDay,
    openTime: wh.openTime,
    closeTime: wh.closeTime,
    isClosed: wh.openTime === 0 && wh.closeTime === 0,
  }));
};

// 스케줄 확인 모달 컴포넌트
interface IScheduleConfirmModalProps {
  ptName?: string;
  trainerName?: string;
  chosenSchedule: IDaySchedule;
  pattern: ISchedulePattern;
  duration: number;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isPending?: boolean;
  selectedCenter?: IFitnessCenters[number] | null;
  selectedPt: IPtProgramsByCenter[number];
  selectedTrainer: IPtProgramsByCenter[number]["trainer"][number];
}

const ScheduleConfirmModal = ({
  ptName,
  trainerName,
  chosenSchedule,
  pattern,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    return a.localeCompare(b); // 정기/비정기 모두 날짜순 정렬
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-md max-h-[80vh] flex flex-col border-2 border-green-500">
        <CardContent className="p-6 overflow-y-auto">
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
                  {formatTime(chosenSchedule[sortedKeys[0]][0])} ~{" "}
                  {formatTime(
                    addThirtyMinutes(
                      chosenSchedule[sortedKeys[0]][
                        chosenSchedule[sortedKeys[0]].length - 1
                      ]
                    )
                  )}
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
              <div className="flex flex-col items-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="text-gray-600">PT 일정을 생성하는 중입니다...</p>
                <p className="text-sm text-gray-500">잠시만 기다려주세요</p>
              </div>
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
  selectedCenter,
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
  const [isPrescheduleLoading, setIsPrescheduleLoading] = useState(false);
  const [prescheduleError, setPrescheduleError] = useState<string | null>(null);

  // 트레이너 스케줄 및 근무시간 조회
  const { data: trainerScheduleData } =
    useSWR<ITrainerSchedule>(
      `/api/member/trainer-schedule?trainerId=${selectedTrainer.id}`,
      fetcher
    );

  // 근무시간 데이터 변환
  const openingHours = trainerScheduleData?.workingHours
    ? convertWorkingHoursToOpeningHours(trainerScheduleData.workingHours)
    : [];

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

  // Preschedule API 호출 함수
  const handlePreschedule = async () => {
    if (!selectedCenter) return;

    // 이미 로딩 중이면 중복 요청 방지
    if (isPrescheduleLoading) return;

    setIsPrescheduleLoading(true);
    setPrescheduleError(null);

    try {
      const response = await fetch("/api/member/pt/preschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chosenSchedule,
          centerId: selectedCenter.id,
          ptProductId: selectedPt.id,
          pattern,
          trainerId: selectedTrainer.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // 특정 에러 메시지 처리
        if (result.error?.includes("이미 PENDING 상태의 PT가 존재")) {
          throw new Error(
            "이미 신청 대기 중인 PT가 있습니다. 현재 PT를 먼저 처리해주세요."
          );
        }
        throw new Error(result.error || "사전 스케줄링 실패");
      }

      // 성공 시 다음 단계로 이동
      setShowConfirmModal(false);
      onNext(result);
    } catch (err) {
      setPrescheduleError(err instanceof Error ? err.message : "Unknown error");
      // 에러 발생 시 모달은 닫지 않고 유지
    } finally {
      setIsPrescheduleLoading(false);
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
        openingHours={openingHours}
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
          onConfirm={async () => {
            await handlePreschedule();
          }}
          onCancel={() => {
            setShowConfirmModal(false);
            setChosenSchedule({});
          }}
          isPending={isPrescheduleLoading}
          selectedCenter={selectedCenter}
          selectedPt={selectedPt}
          selectedTrainer={selectedTrainer}
        />
      )}

      {/* 에러 메시지 */}
      {prescheduleError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{prescheduleError}</p>
        </div>
      )}
    </div>
  );
};

export default ScheduleSelectionStep;
