// components/ptNew/PtSelectionStep.tsx
"use client";

import useSWR from "swr";
import { Button } from "@/app/components/ui/Button";
import { ErrorMessage } from "@/app/components/ui/Loading";
import { IPtProgramsByCenter } from "@/app/lib/services/pt-apply.service";

// API fetcher
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

interface PtSelectionStepProps {
  centerId: string;
  selectedPt: IPtProgramsByCenter[number] | null;
  selectedTrainer: IPtProgramsByCenter[number]["trainer"][number] | null;
  onSelectPt: (pt: IPtProgramsByCenter[number] | null) => void;
  onSelectTrainer: (
    trainer: IPtProgramsByCenter[number]["trainer"][number]
  ) => void;
  onNext: () => void;
}

export const PtSelectionStep = ({
  centerId,
  selectedPt,
  selectedTrainer,
  onSelectPt,
  onSelectTrainer,
  onNext,
}: PtSelectionStepProps) => {
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
