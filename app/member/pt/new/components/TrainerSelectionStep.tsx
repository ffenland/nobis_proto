"use client";

import { useState, useEffect } from "react";
import { User, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { Card, CardContent } from "@/app/components/ui/Card";
import { formatMinutesToKorean } from "@/app/lib/utils/time.utils";
import type { 
  FitnessCentersForPtApply,
  TrainersWithPtProgramsByCenter 
} from "@/app/services/member/pt/pt.service";

interface TrainerSelectionStepProps {
  selectedCenter: FitnessCentersForPtApply[number];
  selectedTrainer: TrainersWithPtProgramsByCenter[number] | null;
  selectedPt: TrainersWithPtProgramsByCenter[number]["ptProduct"][number] | null;
  onSelectTrainer: (trainer: TrainersWithPtProgramsByCenter[number]) => void;
  onSelectPt: (pt: TrainersWithPtProgramsByCenter[number]["ptProduct"][number]) => void;
  onNext: () => void;
}

export default function TrainerSelectionStep({
  selectedCenter,
  selectedTrainer,
  selectedPt,
  onSelectTrainer,
  onSelectPt,
  onNext,
}: TrainerSelectionStepProps) {
  const [trainers, setTrainers] = useState<TrainersWithPtProgramsByCenter>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTrainerId, setExpandedTrainerId] = useState<string | null>(null);
  const [selectedPtId, setSelectedPtId] = useState<string | null>(null);

  // 트레이너 목록 로드
  useEffect(() => {
    const loadTrainers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/member/new-pt/trainers?center=${selectedCenter.id}`
        );

        if (!response.ok) {
          throw new Error("트레이너 목록을 불러올 수 없습니다.");
        }

        const data: TrainersWithPtProgramsByCenter = await response.json();
        setTrainers(data);
      } catch (err) {
        console.error("트레이너 로딩 실패:", err);
        setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    loadTrainers();
  }, [selectedCenter.id]);

  const handleTrainerClick = (trainer: TrainersWithPtProgramsByCenter[number]) => {
    if (expandedTrainerId === trainer.id) {
      setExpandedTrainerId(null);
      setSelectedPtId(null);
    } else {
      setExpandedTrainerId(trainer.id);
      setSelectedPtId(null);
    }
  };

  const handlePtSelect = (trainer: TrainersWithPtProgramsByCenter[number], pt: TrainersWithPtProgramsByCenter[number]["ptProduct"][number]) => {
    setSelectedPtId(pt.id);
    onSelectTrainer(trainer);
    onSelectPt(pt);
  };

  const handleApplyClick = () => {
    onNext();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">트레이너 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">
            <User className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
          >
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 px-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <User className="w-5 h-5" />
          트레이너 선택
        </h3>
        <p className="text-sm text-gray-600">
          {selectedCenter.title}에서 수업 가능한 트레이너를 선택해주세요.
        </p>
      </div>

      <div className="space-y-4">
        {trainers.map((trainer) => {
          const isExpanded = expandedTrainerId === trainer.id;
          return (
            <Card key={trainer.id} className="overflow-hidden mx-0">
              <CardContent className="p-0">
                {/* 트레이너 정보 헤더 - 클릭 가능 */}
                <div 
                  className="p-4 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleTrainerClick(trainer)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {trainer.user.username} 트레이너
                      </h4>
                      {trainer.introduce && (
                        <p className="text-sm text-gray-600 mt-1">
                          {trainer.introduce}
                        </p>
                      )}
                    </div>
                    <div className="text-gray-400">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* PT 프로그램 목록 - 조건부 렌더링 및 애니메이션 */}
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="p-4 space-y-3">
                    <h5 className="text-sm font-medium text-gray-700">
                      수업 가능한 PT 프로그램
                    </h5>
                    <div className="space-y-3">
                      {trainer.ptProduct.map((ptProgram) => (
                        <div key={ptProgram.id} className="space-y-2">
                          <div
                            className={`p-3 bg-white border rounded-lg cursor-pointer transition-colors ${
                              selectedPtId === ptProgram.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                            onClick={() => handlePtSelect(trainer, ptProgram)}
                          >
                            <h6 className="font-medium text-gray-900 mb-2">
                              {ptProgram.title}
                            </h6>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>{ptProgram.totalCount}회</span>
                                <span className="text-gray-400">•</span>
                                <span>회당 {formatMinutesToKorean(ptProgram.time)}</span>
                                <span className="text-gray-400">•</span>
                                <span className="font-semibold text-gray-900">
                                  {ptProgram.price.toLocaleString()}원
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* 선택된 PT 프로그램에 대한 신청 버튼 */}
                          {selectedPtId === ptProgram.id && (
                            <div className="flex justify-center pt-2">
                              <Button
                                onClick={handleApplyClick}
                                size="sm"
                                className="px-8"
                              >
                                신청하기
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}