"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MemberSearch from "./components/MemberSearch";
import TrainerSelect from "./components/TrainerSelect";
import SessionInfo from "./components/SessionInfo";
import DateSelection from "./components/DateSelection";
import SummaryModal from "./components/SummaryModal";
import type { 
  SearchMembersResult, 
  GetTrainersResult,
  CreateDirectRegistrationResult 
} from "@/app/lib/services/manager/direct-registration.service";

type Step = "member" | "trainer" | "info" | "dates";

interface SessionData {
  totalCount: number;
  time: number;
}

export default function DirectRegistrationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("member");
  const [selectedMember, setSelectedMember] = useState<SearchMembersResult[0] | null>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<GetTrainersResult[0] | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionData>({ totalCount: 10, time: 60 });
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<CreateDirectRegistrationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleMemberSelect = (member: SearchMembersResult[0]) => {
    setSelectedMember(member);
    setCurrentStep("trainer");
  };

  const handleTrainerSelect = (trainer: GetTrainersResult[0]) => {
    setSelectedTrainer(trainer);
    setCurrentStep("info");
  };

  const handleSessionInfoSubmit = (data: SessionData) => {
    setSessionInfo(data);
    setCurrentStep("dates");
  };

  const handleDateSelection = async (schedules: Array<{ date: Date; startTime: number; endTime: number }>) => {
    if (!selectedMember || !selectedTrainer) return;

    setSelectedDates(schedules.map(s => s.date));
    setIsLoading(true);

    try {
      const response = await fetch("/api/manager/direct-registration/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedMember.id,
          trainerId: selectedTrainer.id,
          totalCount: sessionInfo.totalCount,
          time: sessionInfo.time,
          selectedDates: schedules.map(s => s.date.toISOString()),
          schedules: schedules.map(s => ({
            date: s.date.toISOString(),
            startTime: s.startTime,
            endTime: s.endTime
          }))
        })
      });

      const data = await response.json();

      if (response.ok) {
        setRegistrationResult(data);
        setShowSummary(true);
      } else {
        alert(data.error || "등록 중 오류가 발생했습니다.");
      }
    } catch (error) {
      alert("등록 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep("member");
    setSelectedMember(null);
    setSelectedTrainer(null);
    setSessionInfo({ totalCount: 10, time: 60 });
    setSelectedDates([]);
    setShowSummary(false);
    setRegistrationResult(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">기존 수업 등록</h1>
        <p className="text-gray-600 mb-8">
          앱 도입 이전에 진행 중이던 PT 수업을 시스템에 등록합니다.
        </p>

        {/* 단계 표시 */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <StepIndicator 
              number={1} 
              label="회원 선택" 
              active={currentStep === "member"} 
              completed={!!selectedMember} 
            />
            <div className="h-px bg-gray-300 w-16"></div>
            <StepIndicator 
              number={2} 
              label="트레이너 선택" 
              active={currentStep === "trainer"} 
              completed={!!selectedTrainer} 
            />
            <div className="h-px bg-gray-300 w-16"></div>
            <StepIndicator 
              number={3} 
              label="수업 정보" 
              active={currentStep === "info"} 
              completed={currentStep === "dates"} 
            />
            <div className="h-px bg-gray-300 w-16"></div>
            <StepIndicator 
              number={4} 
              label="날짜 선택" 
              active={currentStep === "dates"} 
              completed={false} 
            />
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="min-h-[400px]">
          {currentStep === "member" && (
            <MemberSearch onSelect={handleMemberSelect} />
          )}
          
          {currentStep === "trainer" && (
            <TrainerSelect 
              onSelect={handleTrainerSelect}
              onBack={() => setCurrentStep("member")}
            />
          )}
          
          {currentStep === "info" && (
            <SessionInfo
              initialData={sessionInfo}
              onSubmit={handleSessionInfoSubmit}
              onBack={() => setCurrentStep("trainer")}
            />
          )}
          
          {currentStep === "dates" && (
            <DateSelection
              maxCount={sessionInfo.totalCount}
              onSubmit={handleDateSelection}
              onBack={() => setCurrentStep("info")}
              isLoading={isLoading}
            />
          )}
        </div>

        {/* 요약 모달 */}
        {showSummary && registrationResult && selectedMember && selectedTrainer && (
          <SummaryModal
            result={registrationResult}
            member={selectedMember}
            trainer={selectedTrainer}
            onClose={() => {
              setShowSummary(false);
              handleReset();
            }}
          />
        )}
      </div>
    </div>
  );
}

interface StepIndicatorProps {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}

function StepIndicator({ number, label, active, completed }: StepIndicatorProps) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`
          w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold
          ${active ? "bg-blue-600" : completed ? "bg-green-600" : "bg-gray-400"}
        `}
      >
        {completed ? "✓" : number}
      </div>
      <span className={`mt-2 text-sm ${active ? "text-blue-600 font-medium" : "text-gray-600"}`}>
        {label}
      </span>
    </div>
  );
}