"use client";

import { useState, useEffect } from "react"; // useEffect 추가
import { useRouter } from "next/navigation";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";

import {
  IFitnessCenters,
  IPtProgramsByCenter,
  IDaySchedule,
  type IPendingPtCheck,
  IScheduleSlot,
} from "@/app/lib/services/pt-apply.service";
import { ISchedulePattern } from "@/app/lib/services/schedule.service";
// components import
import PendingPt from "./components/PendingPt";
import StepIndicator from "./components/StepIndicator";
import CenterSelectionStep from "./components/CenterSelectionStep";
import PtSelectionStep from "./components/PtSelectionStep";
import ScheduleSelectionStep from "./components/ScheduleSelectionStep";
import ConfirmationStep from "./components/ConfirmationStep";

const PtApplicationPage = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🚨 NEW: PENDING PT 체크 상태만 추가
  const [pendingPtCheck, setPendingPtCheck] = useState<IPendingPtCheck>({
    hasPending: false,
  });
  const [isCheckingPending, setIsCheckingPending] = useState(true);

  // 기존 선택된 데이터 (그대로 유지)
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
  const [checkedSchedule, setCheckedSchedule] = useState<IScheduleSlot[]>([]); // 다른 일정과 겹치지 않음이 확인된 스케줄
  const [message, setMessage] = useState("");

  const stepTitles = [
    "헬스장 선택",
    "PT 프로그램 선택",
    "스케줄 설정",
    "신청 확인",
  ];

  // 이전 단계로 이동하면서 해당 단계 이후의 state들 초기화
  const goToPreviousStep = () => {
    const newStep = currentStep - 1;

    // 각 단계에 따라 해당 단계 이후의 state들 초기화
    switch (newStep) {
      case 0: // 헬스장 선택으로 돌아감
        setSelectedCenter(null);
        setSelectedPt(null);
        setSelectedTrainer(null);
        setPattern({ regular: true, count: 2 });
        setChosenSchedule({});
        setCheckedSchedule([]);
        setMessage("");
        break;
      case 1: // PT 프로그램 선택으로 돌아감
        setSelectedPt(null);
        setSelectedTrainer(null);
        setPattern({ regular: true, count: 2 });
        setChosenSchedule({});
        setCheckedSchedule([]);
        setMessage("");
        break;
      case 2: // 스케줄 설정으로 돌아감
        setPattern({ regular: true, count: 2 });
        setChosenSchedule({});
        setCheckedSchedule([]);
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
        const response = await fetch("/api/member/pending-pt-check");

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

  // 최종 Pt를 신청하는 프로세스, 일정대로 PtRecord를 생성한다.
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
        fitnessCenterId: selectedCenter.id, // totalCount 대신 fitnessCenterId 사용
        duration: selectedPt.time, // 수업 시간 (분 단위)
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
        // 🚨 NEW: PENDING PT 에러 특별 처리만 추가
        if (response.status === 409 && result.details?.pendingPtId) {
          alert(
            `이미 승인 대기 중인 PT 신청이 있습니다.\n` +
              `프로그램: ${result.details.ptTitle}\n` +
              `트레이너: ${result.details.trainerName}\n` +
              `신청일: ${new Date(
                result.details.appliedDate
              ).toLocaleDateString()}\n\n` +
              `기존 신청을 취소한 후 새로 신청해주세요.`
          );
          router.push("/member/pt/");
        } else {
          alert(result.error || "신청 중 오류가 발생했습니다.");
        }
      }
    } catch (error) {
      console.error("PT 신청 오류:", error);
      alert("신청 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🚨 NEW: 로딩 중 (PENDING 체크)
  if (isCheckingPending) {
    return (
      <PageLayout maxWidth="md">
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

  // 기존 renderCurrentStep 함수 (완전히 그대로 유지)
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
            selectedCenter={selectedCenter}
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
            onGoBack={goToPreviousStep}
          />
        ) : null;
      default:
        return null;
    }
  };

  // 기존 return 문 (완전히 그대로 유지)
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
                onClick={goToPreviousStep}
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
