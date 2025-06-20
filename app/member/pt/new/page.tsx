"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { ErrorMessage } from "@/app/components/ui/Loading";
import {
  ICentersForMember,
  IPtAndTrainer,
  ITrainer,
} from "@/app/lib/services/pt-application.service";
import { DaySchedule } from "@/app/lib/schedule";
import {
  IDaySchedule,
  ISchedulePattern,
} from "@/app/lib/services/schedule.service";
import ScheduleSelector from "@/app/components/schedule/scheduleSelector";
import {
  ScheduleConfirmModal,
  ScheduleValidationResult,
  useScheduleValidation,
} from "@/app/components/schedule/scheduleValidation";

// API fetcher
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

// 진행 단계 표시 컴포넌트
const StepIndicator = ({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) => {
  return (
    <div className="flex items-center justify-center mb-6">
      <div className="flex items-center space-x-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i < currentStep
                  ? "bg-gray-900 text-white"
                  : i === currentStep
                  ? "bg-gray-200 text-gray-900 border-2 border-gray-900"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {i + 1}
            </div>
            {i < totalSteps - 1 && (
              <div
                className={`w-8 h-0.5 mx-1 ${
                  i < currentStep ? "bg-gray-900" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// 센터 선택 단계
const CenterSelectionStep = ({
  selectedCenter,
  onSelectCenter,
  onNext,
}: {
  selectedCenter: ICentersForMember[number] | null;
  onSelectCenter: (center: ICentersForMember[number]) => void;
  onNext: () => void;
}) => {
  const {
    data: centers,
    error,
    isLoading,
  } = useSWR<ICentersForMember>("/api/member/centers", fetcher);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-500 text-sm mt-2">센터 목록을 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message="센터 목록을 불러올 수 없습니다." />;
  }

  return (
    <div className="space-y-4">
      <div className="text-center text-gray-600 mb-6">
        <p>운동을 하실 헬스장을 선택해주세요.</p>
        <p className="text-sm">
          어느 센터에서 등록하셔도 모든 센터를 이용하실 수 있습니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {centers?.map((center) => (
          <button
            key={center.id}
            onClick={() => onSelectCenter(center)}
            className={`p-4 border-2 rounded-lg text-left transition-all hover:shadow-md ${
              selectedCenter?.id === center.id
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <h3 className="font-semibold text-gray-900 mb-2">{center.title}</h3>
            <p className="text-sm text-gray-600 mb-1">{center.address}</p>
            <p className="text-sm text-gray-500">{center.phone}</p>
          </button>
        ))}
      </div>

      {selectedCenter && (
        <div className="pt-4">
          <Button onClick={onNext} className="w-full">
            다음 단계
          </Button>
        </div>
      )}
    </div>
  );
};

// PT 프로그램 선택 단계
const PtSelectionStep = ({
  centerId,
  selectedPt,
  selectedTrainer,
  onSelectPt,
  onSelectTrainer,
  onNext,
}: {
  centerId: string;
  selectedPt: IPtAndTrainer[number] | null;
  selectedTrainer: ITrainer | null;
  onSelectPt: (pt: IPtAndTrainer[number] | null) => void;
  onSelectTrainer: (trainer: ITrainer) => void;
  onNext: () => void;
}) => {
  const {
    data: ptPrograms,
    error,
    isLoading,
  } = useSWR<IPtAndTrainer>(
    `/api/member/pt-programs?centerId=${centerId}`,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-500 text-sm mt-2">
          PT 프로그램을 불러오는 중...
        </p>
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message="PT 프로그램 목록을 불러올 수 없습니다." />;
  }

  return (
    <div className="space-y-6">
      <div className="text-center text-gray-600 mb-6">
        <p>원하는 PT 프로그램을 선택하세요.</p>
      </div>

      <div className="space-y-4">
        {ptPrograms?.map((pt) => (
          <div
            key={pt.id}
            className={`border-2 rounded-lg transition-all ${
              selectedPt?.id === pt.id
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200"
            }`}
          >
            <button
              onClick={() => onSelectPt(selectedPt?.id === pt.id ? null : pt)}
              className="w-full p-4 text-left"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-gray-900">{pt.title}</h3>
                <Badge variant="default">{pt.price.toLocaleString()}원</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-2">{pt.description}</p>
              <div className="flex gap-4 text-sm text-gray-500">
                <span>총 {pt.totalCount}회</span>
                <span>•</span>
                <span>회당 {pt.time}시간</span>
              </div>
            </button>

            {/* 트레이너 선택 */}
            {selectedPt?.id === pt.id && (
              <div className="border-t border-gray-200 p-4">
                <h4 className="font-medium text-gray-900 mb-3">
                  트레이너를 선택하세요
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {pt.trainer.map((trainer) => (
                    <button
                      key={trainer.id}
                      onClick={() => onSelectTrainer(trainer)}
                      className={`p-3 border rounded-lg text-left transition-all ${
                        selectedTrainer?.id === trainer.id
                          ? "border-gray-900 bg-gray-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {trainer.user.username[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {trainer.user.username}
                          </p>
                          <p className="text-sm text-gray-600">
                            {trainer.introduce || "소개글이 없습니다."}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedPt && selectedTrainer && (
        <div className="pt-4">
          <Button onClick={onNext} className="w-full">
            다음 단계
          </Button>
        </div>
      )}
    </div>
  );
};

// 운동 주기 선택 단계
const PatternSelectionStep = ({
  pattern,
  onSelectPattern,
  onNext,
}: {
  pattern: { regular: boolean; count: number } | null;
  onSelectPattern: (pattern: { regular: boolean; count: number }) => void;
  onNext: () => void;
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center text-gray-600 mb-6">
        <p>운동 주기를 선택해주세요.</p>
      </div>

      {/* 정기/수시 선택 */}
      <div className="space-y-4">
        <button
          onClick={() => onSelectPattern({ regular: true, count: 1 })}
          className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
            pattern?.regular
              ? "border-gray-900 bg-gray-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <h3 className="font-semibold text-gray-900 mb-1">정기 스케줄</h3>
          <p className="text-sm text-gray-600">
            매주 정해진 요일과 시간에 규칙적으로 운동
          </p>
        </button>

        <button
          onClick={() => onSelectPattern({ regular: false, count: 1 })}
          className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
            pattern && !pattern.regular
              ? "border-gray-900 bg-gray-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <h3 className="font-semibold text-gray-900 mb-1">수시 스케줄</h3>
          <p className="text-sm text-gray-600">
            원하는 날짜와 시간을 자유롭게 선택
          </p>
        </button>
      </div>

      {/* 정기 스케줄인 경우 주당 횟수 선택 */}
      {pattern?.regular && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">
            주당 횟수를 선택하세요
          </h4>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((count) => (
              <button
                key={count}
                onClick={() => onSelectPattern({ regular: true, count })}
                className={`p-3 border rounded-lg text-center transition-all ${
                  pattern.count === count
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className="font-medium">주 {count}회</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {pattern && (
        <div className="pt-4">
          <Button onClick={onNext} className="w-full">
            다음 단계
          </Button>
        </div>
      )}
    </div>
  );
};

// 스케줄 선택 단계 (실제 ScheduleSelector 컴포넌트 사용)
const ScheduleSelectionStep = ({
  trainerId,
  pattern,
  totalCount,
  duration,
  onScheduleSelect,
}: {
  trainerId: string;
  pattern: { regular: boolean; count: number };
  totalCount: number;
  duration: number;
  onScheduleSelect: (schedule: IDaySchedule) => void;
}) => {
  const [chosenSchedule, setChosenSchedule] = useState<IDaySchedule>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showValidationResult, setShowValidationResult] = useState(false);

  const {
    isValidating,
    validationResult,
    error,
    validateSchedule,
    resetValidation,
  } = useScheduleValidation();

  // 트레이너 스케줄 조회
  const {
    data: trainerSchedule,
    error: scheduleError,
    isLoading: scheduleLoading,
  } = useSWR<IDaySchedule>(
    `/api/member/trainer-schedule?trainerId=${trainerId}`,
    fetcher
  );

  // 스케줄 패턴 변환
  const schedulePattern: ISchedulePattern = {
    regular: pattern.regular,
    count: pattern.count,
  };

  const handleScheduleConfirm = async () => {
    setShowConfirmModal(false);

    try {
      await validateSchedule({
        trainerId,
        chosenSchedule,
        pattern: schedulePattern,
        totalCount,
      });
      setShowValidationResult(true);
    } catch (err) {
      console.error("스케줄 검증 실패:", err);
    }
  };

  const handleValidationConfirm = () => {
    if (validationResult) {
      onScheduleSelect(chosenSchedule);
    }
  };

  const handleReset = () => {
    setChosenSchedule({});
    setShowValidationResult(false);
    resetValidation();
  };

  const canProceed = () => {
    const selectedDays = Object.keys(chosenSchedule).length;
    if (pattern.regular) {
      return selectedDays === pattern.count;
    }
    return selectedDays >= 2; // 수시 스케줄은 최소 2개
  };

  if (scheduleLoading) {
    return (
      <div className="text-center py-8">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-500 text-sm mt-2">
          트레이너 스케줄을 불러오는 중...
        </p>
      </div>
    );
  }

  if (scheduleError || !trainerSchedule) {
    return <ErrorMessage message="트레이너 스케줄을 불러올 수 없습니다." />;
  }

  if (showValidationResult && validationResult) {
    return (
      <ScheduleValidationResult
        validationResult={validationResult}
        onConfirm={handleValidationConfirm}
        onReset={handleReset}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 스케줄 선택기 */}
      <ScheduleSelector
        trainerId={trainerId}
        pattern={schedulePattern}
        duration={duration}
        chosenSchedule={chosenSchedule}
        setChosenSchedule={setChosenSchedule}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* 선택 완료 버튼 */}
      {canProceed() && (
        <div className="pt-4">
          <Button
            onClick={() => setShowConfirmModal(true)}
            disabled={isValidating}
            className="w-full"
          >
            선택 완료
          </Button>
        </div>
      )}

      {/* 확인 모달 */}
      {showConfirmModal && (
        <ScheduleConfirmModal
          chosenSchedule={chosenSchedule}
          pattern={schedulePattern}
          duration={duration}
          onConfirm={handleScheduleConfirm}
          onCancel={() => setShowConfirmModal(false)}
          isPending={isValidating}
        />
      )}
    </div>
  );
};

// 신청 완료 단계
const ConfirmationStep = ({
  center,
  pt,
  trainer,
  pattern,
  selectedSchedule,
}: {
  center: ICentersForMember[number] | null;
  pt: IPtAndTrainer[number] | null;
  trainer: ITrainer | null;
  pattern: { regular: boolean; count: number } | null;
  selectedSchedule: IDaySchedule | null;
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!pt || !trainer || !pattern || !selectedSchedule) {
      setError("필수 정보가 누락되었습니다.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/member/pt-application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ptProductId: pt.id,
          trainerId: trainer.id,
          chosenSchedule: selectedSchedule,
          pattern: {
            regular: pattern.regular,
            howmany: pattern.count,
          },
          totalCount: pt.totalCount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "PT 신청 처리 중 오류가 발생했습니다.");
      }

      // 성공 시 PT 목록으로 이동
      router.push(`/member/pt?success=true&ptId=${data.ptId}`);
    } catch (error) {
      console.error("PT 신청 오류:", error);
      setError(
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="text-2xl mb-2">✅</div>
        <h3 className="font-medium text-gray-900">신청 내용을 확인해주세요</h3>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">센터</h4>
          <p className="text-gray-700">{center?.title}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">PT 프로그램</h4>
          <p className="text-gray-700">{pt?.title}</p>
          <p className="text-sm text-gray-600">
            {pt?.totalCount}회 · {pt?.price.toLocaleString()}원
          </p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">트레이너</h4>
          <p className="text-gray-700">{trainer?.user.username}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">운동 주기</h4>
          <p className="text-gray-700">
            {pattern?.regular
              ? `주 ${pattern.count}회 정기 수업`
              : "수시 스케줄"}
          </p>
        </div>

        {/* 선택된 스케줄 미리보기 */}
        {selectedSchedule && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">선택한 일정</h4>
            <div className="space-y-1">
              {Object.entries(selectedSchedule).map(([date, timeSlots]) => (
                <div key={date} className="text-sm">
                  <span className="text-gray-600">{date}:</span>{" "}
                  <span className="text-gray-700">
                    {timeSlots
                      .map((time) => {
                        const hour = Math.floor(time / 100);
                        const minute = time % 100;
                        return `${hour.toString().padStart(2, "0")}:${minute
                          .toString()
                          .padStart(2, "0")}`;
                      })
                      .join(", ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 에러 메시지 표시 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full"
        loading={isSubmitting}
      >
        {isSubmitting ? "신청 처리 중..." : "PT 신청하기"}
      </Button>
    </div>
  );
};

// 메인 PT 신청 페이지
const PtNewPage = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCenter, setSelectedCenter] = useState<
    ICentersForMember[number] | null
  >(null);
  const [selectedPt, setSelectedPt] = useState<IPtAndTrainer[number] | null>(
    null
  );
  const [selectedTrainer, setSelectedTrainer] = useState<ITrainer | null>(null);
  const [ptPattern, setPtPattern] = useState<{
    regular: boolean;
    count: number;
  } | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<IDaySchedule | null>(
    null
  );

  const steps = [
    { title: "센터 선택", subtitle: "운동할 헬스장을 선택하세요" },
    {
      title: "PT 프로그램",
      subtitle: "원하는 PT 프로그램과 트레이너를 선택하세요",
    },
    { title: "운동 주기", subtitle: "정기 또는 비정기 수업을 선택하세요" },
    { title: "일정 선택", subtitle: "운동 일정을 설정하세요" },
    { title: "신청 완료", subtitle: "신청 내용을 확인하고 완료하세요" },
  ];

  const handleBack = () => {
    if (currentStep === 0) {
      router.back();
    } else {
      setCurrentStep(currentStep - 1);
      // 이전 단계로 돌아갈 때 관련 선택 상태 초기화
      if (currentStep === 1) {
        setSelectedCenter(null);
      } else if (currentStep === 2) {
        setSelectedPt(null);
        setSelectedTrainer(null);
      } else if (currentStep === 3) {
        setPtPattern(null);
      } else if (currentStep === 4) {
        setSelectedSchedule(null);
      }
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // 스케줄 선택 완료 핸들러
  const handleScheduleSelect = (schedule: IDaySchedule) => {
    setSelectedSchedule(schedule);
    handleNext();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <CenterSelectionStep
            selectedCenter={selectedCenter}
            onSelectCenter={setSelectedCenter}
            onNext={handleNext}
          />
        );
      case 1:
        return selectedCenter ? (
          <PtSelectionStep
            centerId={selectedCenter.id}
            selectedPt={selectedPt}
            selectedTrainer={selectedTrainer}
            onSelectPt={setSelectedPt}
            onSelectTrainer={setSelectedTrainer}
            onNext={handleNext}
          />
        ) : null;
      case 2:
        return (
          <PatternSelectionStep
            pattern={ptPattern}
            onSelectPattern={setPtPattern}
            onNext={handleNext}
          />
        );
      case 3:
        return selectedTrainer && ptPattern && selectedPt ? (
          <ScheduleSelectionStep
            trainerId={selectedTrainer.id}
            pattern={ptPattern}
            totalCount={selectedPt.totalCount}
            duration={selectedPt.time}
            onScheduleSelect={handleScheduleSelect}
          />
        ) : null;
      case 4:
        return (
          <ConfirmationStep
            center={selectedCenter}
            pt={selectedPt}
            trainer={selectedTrainer}
            pattern={ptPattern}
            selectedSchedule={selectedSchedule}
          />
        );
      default:
        return null;
    }
  };

  return (
    <PageLayout maxWidth="md">
      {/* 헤더 */}
      <PageHeader
        title="PT 신청"
        subtitle={steps[currentStep].subtitle}
        action={
          <Button variant="outline" onClick={handleBack}>
            {currentStep === 0 ? "취소" : "이전"}
          </Button>
        }
      />

      {/* 진행 단계 표시 */}
      <StepIndicator currentStep={currentStep} totalSteps={steps.length} />

      {/* 현재 단계 내용 */}
      <Card>
        <CardContent className="p-6">{renderStep()}</CardContent>
      </Card>
    </PageLayout>
  );
};

export default PtNewPage;
