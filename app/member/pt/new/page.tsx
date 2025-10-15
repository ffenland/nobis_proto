"use client";

import { useState, useEffect } from "react"; // useEffect 추가
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";

import type { IPendingPtCheck } from "@/app/services/member/pt/pt.service";
import type {
  FitnessCentersForPtApply,
  TrainersWithPtProgramsByCenter,
} from "@/app/services/member/pt/pt.service";
// components import
import PendingPt from "./components/PendingPt";
import StepIndicator from "./components/StepIndicator";
import CenterSelectionStep from "./components/CenterSelectionStep";
import TrainerSelectionStep from "./components/TrainerSelectionStep";
import DateSelectionStep from "./components/DateSelectionStep";
import ConfirmationStep from "./components/ConfirmationStep";

const PtApplicationPage = () => {
  const [currentStep, setCurrentStep] = useState(0);

  // 🚨 NEW: PENDING PT 체크 상태만 추가
  const [pendingPtCheck, setPendingPtCheck] = useState<IPendingPtCheck>({
    hasPending: false,
  });
  const [isCheckingPending, setIsCheckingPending] = useState(true);

  // 선택된 데이터
  const [selectedCenter, setSelectedCenter] = useState<
    FitnessCentersForPtApply[number] | null
  >(null);
  const [selectedTrainer, setSelectedTrainer] = useState<
    TrainersWithPtProgramsByCenter[number] | null
  >(null);
  const [selectedPt, setSelectedPt] = useState<
    TrainersWithPtProgramsByCenter[number]["ptProducts"][number] | null
  >(null);
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [message, setMessage] = useState("");

  const stepTitles = [
    "헬스장 선택",
    "트레이너 선택",
    "시작일 선택",
    "신청 확인",
  ];

  // 이전 단계로 이동하면서 해당 단계 이후의 state들 초기화
  const goToPreviousStep = () => {
    const newStep = currentStep - 1;

    // 각 단계에 따라 해당 단계 이후의 state들 초기화
    switch (newStep) {
      case 0: // 헬스장 선택으로 돌아감
        setSelectedCenter(null);
        setSelectedTrainer(null);
        setSelectedPt(null);
        setSelectedStartDate(null);
        setMessage("");
        break;
      case 1: // 트레이너 선택으로 돌아감
        setSelectedTrainer(null);
        setSelectedPt(null);
        setSelectedStartDate(null);
        setMessage("");
        break;
      case 2: // 시작일 선택으로 돌아감
        setSelectedStartDate(null);
        setMessage("");
        break;
      case 3: // 신청 확인으로 돌아감
        setMessage("");
        break;
    }

    setCurrentStep(newStep);
  };

  // 🚨 NEW: 페이지 로드 시 PENDING PT 체크만 추가
  useEffect(() => {
    const checkPendingPt = async () => {
      try {
        setIsCheckingPending(true);
        const response = await fetch("/api/member/new-pt/check-pending");

        if (!response.ok) {
          throw new Error("PENDING PT 체크 실패");
        }

        const result: IPendingPtCheck = await response.json();
        setPendingPtCheck(result);
      } catch (error) {
        console.error("PENDING PT 체크 실패:", error);
        // 에러가 발생해도 페이지는 접근 가능하도록 함
        setPendingPtCheck({ hasPending: false });
      } finally {
        setIsCheckingPending(false);
      }
    };

    checkPendingPt();
  }, []);

  // 🚨 NEW: 로딩 중 (PENDING 체크)
  if (isCheckingPending) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="text-gray-600">PT 신청 가능 여부를 확인하는 중...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  // 🚨 NEW: PENDING PT가 있으면 차단 UI 표시
  if (pendingPtCheck.hasPending && pendingPtCheck.pendingPt) {
    const { pendingPt } = pendingPtCheck;
    return <PendingPt pendingPt={pendingPt} />;
  }

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
          <TrainerSelectionStep
            selectedCenter={selectedCenter}
            selectedTrainer={selectedTrainer}
            selectedPt={selectedPt}
            onSelectTrainer={setSelectedTrainer}
            onSelectPt={setSelectedPt}
            onNext={() => setCurrentStep(2)}
          />
        ) : null;
      case 2:
        return selectedPt && selectedTrainer ? (
          <DateSelectionStep
            selectedCenter={selectedCenter}
            selectedPt={selectedPt}
            selectedTrainer={selectedTrainer}
            onNext={(startDate) => {
              setSelectedStartDate(startDate);
              setCurrentStep(3);
            }}
          />
        ) : null;
      case 3:
        return selectedCenter &&
          selectedPt &&
          selectedTrainer &&
          selectedStartDate ? (
          <ConfirmationStep
            selectedCenter={selectedCenter}
            selectedPt={selectedPt}
            selectedTrainer={selectedTrainer}
            selectedStartDate={selectedStartDate}
            message={message}
            setMessage={setMessage}
            onGoBack={goToPreviousStep}
          />
        ) : null;
      default:
        return null;
    }
  };

  // 기존 return 문 (완전히 그대로 유지)
  return (
    <PageLayout>
      <PageHeader
        title="PT 신청"
        subtitle="새로운 PT 프로그램을 신청해보세요"
      />

      <Card>
        <CardContent className="pt-6 px-0">
          <StepIndicator
            currentStep={currentStep}
            totalSteps={4}
            stepTitles={stepTitles}
          />

          {renderCurrentStep()}

          {/* 이전 버튼 */}
          {currentStep > 0 && (
            <div className="mt-6 pt-4 border-t">
              <Button variant="outline" onClick={goToPreviousStep}>
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
