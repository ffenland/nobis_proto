"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import {
  StepIndicator,
  CenterSelectionStep,
  PtSelectionStep,
  ScheduleSelectionStep,
  ConfirmationStep,
} from "@/app/components/ptNew";
import {
  IFitnessCenters,
  IPtProgramsByCenter,
  IDaySchedule,
} from "@/app/lib/services/pt-apply.service";
import { ISchedulePattern } from "@/app/lib/services/schedule.service";

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
