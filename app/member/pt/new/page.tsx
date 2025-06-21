"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Input, Textarea } from "@/app/components/ui/Input";
import { Badge } from "@/app/components/ui/Loading";
import { LoadingPage, ErrorMessage } from "@/app/components/ui/Loading";
import ScheduleSelector from "@/app/components/schedule/scheduleSelector";
import {
  ScheduleConfirmModal,
  ScheduleValidationResult,
  useScheduleValidation,
} from "@/app/components/schedule/scheduleValidation";
import {
  IFitnessCenters,
  IPtProgramsByCenter,
  IDaySchedule,
} from "@/app/lib/services/pt-apply.service";
import {
  ISchedulePattern,
  IScheduleValidationData,
} from "@/app/lib/services/schedule.service";

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
  stepTitles,
}: {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
}) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-center mb-4">
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
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900">
          {stepTitles[currentStep]}
        </h2>
        <p className="text-sm text-gray-600">
          {currentStep + 1} / {totalSteps} 단계
        </p>
      </div>
    </div>
  );
};

// 헬스장 선택 단계
const CenterSelectionStep = ({
  selectedCenter,
  onSelectCenter,
  onNext,
}: {
  selectedCenter: IFitnessCenters[number] | null;
  onSelectCenter: (center: IFitnessCenters[number]) => void;
  onNext: () => void;
}) => {
  const {
    data: centers,
    error,
    isLoading,
  } = useSWR<IFitnessCenters>("/api/member/fitness-centers", fetcher);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-500 text-sm mt-2">
          헬스장 목록을 불러오는 중...
        </p>
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message="헬스장 목록을 불러올 수 없습니다." />;
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
  selectedPt: IPtProgramsByCenter[number] | null;
  selectedTrainer: IPtProgramsByCenter[number]["trainer"][number] | null;
  onSelectPt: (pt: IPtProgramsByCenter[number] | null) => void;
  onSelectTrainer: (
    trainer: IPtProgramsByCenter[number]["trainer"][number]
  ) => void;
  onNext: () => void;
}) => {
  const {
    data: ptPrograms,
    error,
    isLoading,
  } = useSWR<IPtProgramsByCenter>(
    `/api/member/pt-programs-by-center?centerId=${centerId}`,
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
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {pt.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>총 {pt.totalCount}회</span>
                    <span>•</span>
                    <span>회당 {pt.time}시간</span>
                    <span>•</span>
                    <span>{pt.price.toLocaleString()}원</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600">{pt.description}</p>
            </button>

            {/* 트레이너 선택 */}
            {selectedPt?.id === pt.id && (
              <div className="border-t border-gray-200 p-4">
                <h4 className="font-medium text-gray-900 mb-3">
                  담당 트레이너 선택
                </h4>
                <div className="space-y-2">
                  {pt.trainer.map((trainer) => (
                    <button
                      key={trainer.id}
                      onClick={() => onSelectTrainer(trainer)}
                      className={`w-full p-3 border rounded-lg text-left transition-all ${
                        selectedTrainer?.id === trainer.id
                          ? "border-gray-900 bg-white"
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
                          <div className="font-medium text-gray-900">
                            {trainer.user.username}
                          </div>
                          <div className="text-sm text-gray-600">
                            {trainer.introduce}
                          </div>
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

// 스케줄 선택 단계
const ScheduleSelectionStep = ({
  selectedPt,
  selectedTrainer,
  pattern,
  setPattern,
  chosenSchedule,
  setChosenSchedule,
  onNext,
}: {
  selectedPt: IPtProgramsByCenter[number];
  selectedTrainer: IPtProgramsByCenter[number]["trainer"][number];
  pattern: ISchedulePattern;
  setPattern: (pattern: ISchedulePattern) => void;
  chosenSchedule: IDaySchedule;
  setChosenSchedule: (schedule: IDaySchedule) => void;
  onNext: () => void;
}) => {
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

// 최종 확인 및 신청 단계
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
}: {
  selectedCenter: IFitnessCenters[number];
  selectedPt: IPtProgramsByCenter[number];
  selectedTrainer: IPtProgramsByCenter[number]["trainer"][number];
  pattern: ISchedulePattern;
  chosenSchedule: IDaySchedule;
  message: string;
  setMessage: (message: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) => {
  const {
    isValidating,
    validationResult,
    error,
    validateSchedule,
    resetValidation,
  } = useScheduleValidation();

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

  const formatTime = (time: number): string => {
    const hour = Math.floor(time / 100);
    const minute = time % 100;
    return `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
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
              <span className="text-sm text-gray-600">선택된 스케줄</span>
              <div className="space-y-1 mt-1">
                {Object.entries(chosenSchedule).map(([date, times]) =>
                  times.map((time) => (
                    <div key={`${date}-${time}`} className="text-sm">
                      {new Date(date).toLocaleDateString("ko-KR")}{" "}
                      {formatTime(time)}
                    </div>
                  ))
                )}
              </div>
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

// 메인 컴포넌트
const PtApplicationPage = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 선택된 데이터
  const [selectedCenter, setSelectedCenter] = useState<
    IFitnessCenters[number] | null
  >(null);
  const [selectedPt, setSelectedPt] = useState<
    IPtProgramsByCenter[number] | null
  >(null);
  const [selectedTrainer, setSelectedTrainer] = useState<
    IPtProgramsByCenter[number]["trainer"][number] | null
  >(null);
  const [pattern, setPattern] = useState<ISchedulePattern>({
    regular: true,
    count: 2,
  });
  const [chosenSchedule, setChosenSchedule] = useState<IDaySchedule>({});
  const [message, setMessage] = useState("");

  const stepTitles = [
    "헬스장 선택",
    "PT 프로그램 선택",
    "스케줄 설정",
    "신청 확인",
  ];

  const handleSubmit = async () => {
    if (!selectedCenter || !selectedPt || !selectedTrainer) return;

    setIsSubmitting(true);
    try {
      const applicationData = {
        ptProductId: selectedPt.id,
        trainerId: selectedTrainer.id,
        startDate: Object.keys(chosenSchedule).sort()[0], // 첫 번째 날짜를 시작일로
        isRegular: pattern.regular,
        chosenSchedule,
        totalCount: selectedPt.totalCount,
        message,
      };

      const response = await fetch("/api/member/pt-apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(applicationData),
      });

      const result = await response.json();

      if (response.ok) {
        alert("PT 신청이 완료되었습니다!");
        router.push(`/member/pt/${result.ptId}`);
      } else {
        alert(result.error || "신청 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("PT 신청 오류:", error);
      alert("신청 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <CenterSelectionStep
            selectedCenter={selectedCenter}
            onSelectCenter={setSelectedCenter}
            onNext={() => setCurrentStep(1)}
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
            onNext={() => setCurrentStep(2)}
          />
        ) : null;
      case 2:
        return selectedPt && selectedTrainer ? (
          <ScheduleSelectionStep
            selectedPt={selectedPt}
            selectedTrainer={selectedTrainer}
            pattern={pattern}
            setPattern={setPattern}
            chosenSchedule={chosenSchedule}
            setChosenSchedule={setChosenSchedule}
            onNext={() => setCurrentStep(3)}
          />
        ) : null;
      case 3:
        return selectedCenter && selectedPt && selectedTrainer ? (
          <ConfirmationStep
            selectedCenter={selectedCenter}
            selectedPt={selectedPt}
            selectedTrainer={selectedTrainer}
            pattern={pattern}
            chosenSchedule={chosenSchedule}
            message={message}
            setMessage={setMessage}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <PageLayout maxWidth="md">
      <PageHeader
        title="PT 신청"
        subtitle="새로운 PT 프로그램을 신청해보세요"
      />

      <Card>
        <CardContent className="p-6">
          <StepIndicator
            currentStep={currentStep}
            totalSteps={4}
            stepTitles={stepTitles}
          />

          {renderCurrentStep()}

          {/* 이전 버튼 */}
          {currentStep > 0 && (
            <div className="mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={isSubmitting}
              >
                이전 단계
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
};

export default PtApplicationPage;
