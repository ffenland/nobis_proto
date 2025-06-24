"use client";

import { useState, useEffect } from "react"; // useEffect 추가
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

// 🚨 NEW: PENDING PT 체크 타입만 추가
interface IPendingPtCheck {
  hasPending: boolean;
  pendingPt?: {
    id: string;
    ptTitle: string;
    trainerName: string;
    appliedDate: string;
    price: number;
    totalCount: number;
  };
}

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
  const [message, setMessage] = useState("");

  const stepTitles = [
    "헬스장 선택",
    "PT 프로그램 선택",
    "스케줄 설정",
    "신청 확인",
  ];

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

  // 기존 handleSubmit 함수 (PENDING 에러 처리만 추가)
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
          router.push("/member/pt/requests");
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

    return (
      <PageLayout maxWidth="md">
        <PageHeader title="PT 신청" subtitle="승인 대기 중인 신청이 있습니다" />

        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-6">
              {/* 경고 아이콘 */}
              <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>

              {/* 메인 메시지 */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  승인 대기 중인 PT 신청이 있습니다
                </h2>
                <p className="text-gray-600">
                  새로운 PT를 신청하려면 기존 신청을 먼저 취소해주세요.
                </p>
              </div>

              {/* 기존 신청 정보 */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
                <h3 className="font-medium text-amber-900 mb-3">
                  현재 승인 대기 중인 신청
                </h3>
                <div className="space-y-2 text-sm text-amber-800">
                  <div className="flex justify-between">
                    <span className="text-amber-700">프로그램:</span>
                    <span className="font-medium">{pendingPt.ptTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-700">트레이너:</span>
                    <span className="font-medium">{pendingPt.trainerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-700">총 횟수:</span>
                    <span className="font-medium">
                      {pendingPt.totalCount}회
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-700">가격:</span>
                    <span className="font-medium">
                      {pendingPt.price.toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-700">신청일:</span>
                    <span className="font-medium">
                      {new Date(pendingPt.appliedDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* 액션 버튼들 */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => router.push("/member/pt/requests")}
                  className="flex-1 sm:flex-none"
                >
                  신청 현황 관리
                </Button>
                <Button
                  variant="primary"
                  onClick={() => router.push("/member/dashboard")}
                  className="flex-1 sm:flex-none"
                >
                  대시보드로 이동
                </Button>
              </div>

              {/* 도움말 */}
              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                💡 <strong>도움말:</strong> 기존 신청을 취소하려면 &ldquo;신청
                현황 관리&rdquo;에서 해당 신청을 찾아 취소 버튼을 클릭하세요.
              </div>
            </div>
          </CardContent>
        </Card>
      </PageLayout>
    );
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
