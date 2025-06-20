"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { LoadingPage, ErrorMessage } from "@/app/components/ui/Loading";
import {
  ICentersForMember,
  IPtAndTrainer,
  ITrainer,
} from "@/app/lib/services/pt-application.service";
import {
  IDaySchedule,
  ISchedulePattern,
  IScheduleValidationData,
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

// 단계 표시 컴포넌트
const StepIndicator = ({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-center">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
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
  const [ptPattern, setPtPattern] = useState<ISchedulePattern | null>(null);
  const [chosenSchedule, setChosenSchedule] = useState<IDaySchedule>({});

  // 스케줄 검증 훅
  const {
    isValidating,
    validationResult,
    error,
    validateSchedule,
    resetValidation,
  } = useScheduleValidation();

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
      // 이전 단계로 돌아갈 때 검증 결과 초기화
      if (currentStep === 4) {
        resetValidation();
      }
      // 선택 상태 초기화
      if (currentStep === 1) {
        setSelectedCenter(null);
      } else if (currentStep === 2) {
        setSelectedPt(null);
        setSelectedTrainer(null);
      } else if (currentStep === 3) {
        setPtPattern(null);
        setChosenSchedule({});
      }
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // 스케줄 선택 완료 후 검증 시작
  const handleScheduleComplete = async () => {
    if (!selectedTrainer || !ptPattern) return;

    await validateSchedule({
      trainerId: selectedTrainer.id,
      chosenSchedule,
      pattern: ptPattern,
      totalCount: selectedPt?.totalCount || 0,
    });

    handleNext();
  };

  // 최종 PT 신청
  const handleFinalSubmit = async () => {
    // 실제 PT 신청 API 호출
    console.log("PT 신청 데이터:", {
      center: selectedCenter,
      pt: selectedPt,
      trainer: selectedTrainer,
      pattern: ptPattern,
      schedule: chosenSchedule,
      validationResult,
    });

    // 임시로 성공 페이지로 이동
    router.push("/member/pt");
  };

  return (
    <PageLayout maxWidth="md">
      {/* 헤더 */}
      <PageHeader
        title="PT 신청"
        subtitle={steps[currentStep].subtitle}
        action={
          <Button variant="outline" onClick={handleBack}>
            {currentStep === 0 ? "뒤로가기" : "이전"}
          </Button>
        }
      />

      {/* 단계 표시 */}
      <StepIndicator currentStep={currentStep} totalSteps={steps.length} />

      {/* 단계별 제목 */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          {steps[currentStep].title}
        </h2>
      </div>

      {/* 단계별 컨텐츠 */}
      <Card>
        <CardContent className="p-6">
          {currentStep === 0 && (
            <CenterSelectionStep
              selectedCenter={selectedCenter}
              onSelectCenter={setSelectedCenter}
              onNext={handleNext}
            />
          )}

          {currentStep === 1 && selectedCenter && (
            <PtSelectionStep
              centerId={selectedCenter.id}
              selectedPt={selectedPt}
              selectedTrainer={selectedTrainer}
              onSelectPt={setSelectedPt}
              onSelectTrainer={setSelectedTrainer}
              onNext={handleNext}
            />
          )}

          {currentStep === 2 && (
            <PatternSelectionStep
              ptPattern={ptPattern}
              onSelectPattern={setPtPattern}
              onNext={handleNext}
            />
          )}

          {currentStep === 3 && selectedTrainer && ptPattern && selectedPt && (
            <ScheduleSelectionStep
              trainerId={selectedTrainer.id}
              pattern={ptPattern}
              duration={selectedPt.time}
              chosenSchedule={chosenSchedule}
              setChosenSchedule={setChosenSchedule}
              onNext={handleScheduleComplete}
            />
          )}

          {currentStep === 4 && (
            <ConfirmationStep
              center={selectedCenter}
              pt={selectedPt}
              trainer={selectedTrainer}
              pattern={ptPattern}
              chosenSchedule={chosenSchedule}
              validationResult={validationResult}
              onSubmit={handleFinalSubmit}
              onReset={() => {
                setCurrentStep(3);
                resetValidation();
              }}
            />
          )}
        </CardContent>
      </Card>
    </PageLayout>
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
        <p>원하는 PT 프로그램을 선택하고, 담당 트레이너를 선택해주세요.</p>
      </div>

      {/* PT 프로그램 선택 */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">PT 프로그램</h3>
        <div className="grid grid-cols-1 gap-4">
          {ptPrograms?.map((pt) => (
            <button
              key={pt.id}
              onClick={() => {
                onSelectPt(pt);
                onSelectTrainer(pt.trainer[0]); // 첫 번째 트레이너 자동 선택
              }}
              className={`p-4 border-2 rounded-lg text-left transition-all hover:shadow-md ${
                selectedPt?.id === pt.id
                  ? "border-gray-900 bg-gray-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <h4 className="font-semibold text-gray-900 mb-2">{pt.title}</h4>
              <p className="text-sm text-gray-600 mb-2">{pt.description}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {pt.totalCount}회 · {pt.time}시간
                </span>
                <span className="font-medium text-gray-900">
                  {pt.price.toLocaleString()}원
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 트레이너 선택 */}
      {selectedPt && selectedPt.trainer.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">담당 트레이너</h3>
          <div className="grid grid-cols-1 gap-4">
            {selectedPt.trainer.map((trainer) => (
              <button
                key={trainer.id}
                onClick={() => onSelectTrainer(trainer)}
                className={`p-4 border-2 rounded-lg text-left transition-all hover:shadow-md ${
                  selectedTrainer?.id === trainer.id
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-lg">{trainer.user.username[0]}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {trainer.user.username}
                    </h4>
                    <p className="text-sm text-gray-600">{trainer.introduce}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

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
  ptPattern,
  onSelectPattern,
  onNext,
}: {
  ptPattern: ISchedulePattern | null;
  onSelectPattern: (pattern: ISchedulePattern) => void;
  onNext: () => void;
}) => {
  const [showRegularOptions, setShowRegularOptions] = useState(false);

  return (
    <div className="space-y-6">
      <div className="text-center text-gray-600 mb-6">
        <p>운동 주기를 선택해주세요.</p>
      </div>

      {!showRegularOptions ? (
        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => setShowRegularOptions(true)}
            className="p-6 border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">📅</div>
              <h3 className="font-semibold text-gray-900 mb-2">정기 스케줄</h3>
              <p className="text-sm text-gray-600">
                매주 같은 요일, 정해진 시간에 수업합니다. 꾸준한 운동을 위해
                권장드립니다.
              </p>
            </div>
          </button>

          <button
            onClick={() => onSelectPattern({ regular: false, count: 0 })}
            className="p-6 border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all"
          >
            <div className="text-center">
              <div className="text-2xl mb-2">🗓️</div>
              <h3 className="font-semibold text-gray-900 mb-2">수시 스케줄</h3>
              <p className="text-sm text-gray-600">
                원하는 시간대에 예약해서 운동합니다. 유연한 일정 관리가
                가능합니다.
              </p>
            </div>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="font-medium text-gray-900 mb-2">
              일주일에 몇 번 운동하시나요?
            </h3>
            <p className="text-sm text-gray-600">
              요일은 다음 단계에서 선택합니다.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5].map((count) => (
              <button
                key={count}
                onClick={() => onSelectPattern({ regular: true, count })}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all text-center"
              >
                <div className="font-medium text-gray-900">주 {count}회</div>
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={() => setShowRegularOptions(false)}
            className="w-full"
          >
            다시 선택
          </Button>
        </div>
      )}

      {ptPattern && (
        <div className="pt-4">
          <Button onClick={onNext} className="w-full">
            다음 단계
          </Button>
        </div>
      )}
    </div>
  );
};

// 일정 선택 단계 (완전히 새로 구현)
const ScheduleSelectionStep = ({
  trainerId,
  pattern,
  duration,
  chosenSchedule,
  setChosenSchedule,
  onNext,
}: {
  trainerId: string;
  pattern: ISchedulePattern;
  duration: number;
  chosenSchedule: IDaySchedule;
  setChosenSchedule: (schedule: IDaySchedule) => void;
  onNext: () => void;
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 선택 완료 조건 확인
  const isSelectionComplete = () => {
    const selectedCount = Object.keys(chosenSchedule).length;

    if (pattern.regular) {
      return selectedCount === pattern.count;
    } else {
      return selectedCount >= 2; // 수시는 최소 2개
    }
  };

  const handleConfirm = () => {
    if (isSelectionComplete()) {
      setShowConfirmModal(true);
    }
  };

  const handleModalConfirm = () => {
    setShowConfirmModal(false);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center text-gray-600 mb-6">
        <p>
          {pattern.regular
            ? `주 ${pattern.count}회 정기 스케줄을 위한 요일과 시간을 선택해주세요.`
            : "수시 스케줄을 위해 원하는 날짜와 시간을 선택해주세요. (최소 2개)"}
        </p>
      </div>

      <ScheduleSelector
        trainerId={trainerId}
        pattern={pattern}
        duration={duration}
        chosenSchedule={chosenSchedule}
        setChosenSchedule={setChosenSchedule}
      />

      <div className="pt-4">
        <Button
          onClick={handleConfirm}
          disabled={!isSelectionComplete()}
          className="w-full"
        >
          {isSelectionComplete()
            ? "선택 완료"
            : pattern.regular
            ? `${pattern.count}개의 시간을 선택해주세요`
            : "최소 2개의 시간을 선택해주세요"}
        </Button>
      </div>

      {/* 확인 모달 */}
      {showConfirmModal && (
        <ScheduleConfirmModal
          chosenSchedule={chosenSchedule}
          pattern={pattern}
          duration={duration}
          onConfirm={handleModalConfirm}
          onCancel={() => setShowConfirmModal(false)}
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
  chosenSchedule,
  validationResult,
  onSubmit,
  onReset,
}: {
  center: ICentersForMember[number] | null;
  pt: IPtAndTrainer[number] | null;
  trainer: ITrainer | null;
  pattern: ISchedulePattern | null;
  chosenSchedule: IDaySchedule;
  validationResult: IScheduleValidationData | null;
  onSubmit: () => void;
  onReset: () => void;
}) => {
  if (validationResult) {
    return (
      <ScheduleValidationResult
        validationResult={validationResult}
        onConfirm={onSubmit}
        onReset={onReset}
      />
    );
  }

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
            {pt?.totalCount}회 · {pt?.time}시간 · {pt?.price.toLocaleString()}원
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

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">선택한 일정</h4>
          <div className="space-y-1">
            {Object.keys(chosenSchedule)
              .sort()
              .map((dateKey) => {
                const times = chosenSchedule[dateKey];
                return (
                  <div key={dateKey} className="text-sm text-gray-600">
                    {dateKey}: {times.length}개 시간대 선택됨
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      <Button onClick={onSubmit} className="w-full">
        PT 신청하기
      </Button>
    </div>
  );
};

export default PtNewPage;
