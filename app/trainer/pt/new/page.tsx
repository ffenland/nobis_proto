"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/Button";

// Import step components (only needed for 2-step workflow)
import StepIndicator from "./components/StepIndicator";
import MemberSelectionStep from "./components/MemberSelectionStep";
import PtProductSelectionStep from "./components/PtProductSelectionStep";
import { LoadingOverlay } from "@/app/components/ui/LoadingOverlay";

const STEP_NAMES = ["회원 선택", "PT 상품 선택"];

interface SelectedMember {
  id: string;
  name: string;
  email: string;
}

interface SelectedProduct {
  id: string;
  title: string;
  price: number;
  totalCount: number;
  time: number;
  description: string;
}

const NewPtPage = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step data state
  const [selectedMember, setSelectedMember] = useState<SelectedMember | null>(
    null
  );

  // Step navigation handlers
  const handleMemberSelect = (member: SelectedMember) => {
    setSelectedMember(member);
    setCurrentStep(2);
  };

  const handleProductSelect = async (product: SelectedProduct) => {
    if (!selectedMember) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/trainer/pt/new", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "trainer",
          memberId: selectedMember.id,
          ptProductId: product.id,
        }),
      });

      if (!response.ok) {
        throw new Error("PT 생성에 실패했습니다.");
      }

      const result = await response.json();

      // ACCEPTING 상태 PT 생성 완료, pending 페이지로 이동
      router.push(`/trainer/pt/pending/${result.pt.id}`);
    } catch (error) {
      console.error("PT 생성 오류:", error);
      alert("PT 생성 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <MemberSelectionStep onNext={handleMemberSelect} />;

      case 2:
        return (
          <PtProductSelectionStep
            onNext={handleProductSelect}
            onBack={handleBack}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            ← 이전으로
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">새로운 PT 접수</h1>
            <p className="text-gray-600">
              트레이너가 직접 회원의 PT를 생성합니다.
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <StepIndicator
          currentStep={currentStep}
          totalSteps={STEP_NAMES.length}
          stepNames={STEP_NAMES}
        />
      </div>

      {/* Current Step Content */}
      {renderCurrentStep()}

      {/* Loading Overlay */}
      <LoadingOverlay
        isLoading={isLoading}
        message="PT를 생성하고 있습니다..."
      />
    </div>
  );
};

export default NewPtPage;
