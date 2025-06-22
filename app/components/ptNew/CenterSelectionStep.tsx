// components/ptNew/CenterSelectionStep.tsx
"use client";

import useSWR from "swr";
import { Button } from "@/app/components/ui/Button";
import { ErrorMessage } from "@/app/components/ui/Loading";
import { IFitnessCenters } from "@/app/lib/services/pt-apply.service";

// API fetcher
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

interface CenterSelectionStepProps {
  selectedCenter: IFitnessCenters[number] | null;
  onSelectCenter: (center: IFitnessCenters[number]) => void;
  onNext: () => void;
}

export const CenterSelectionStep = ({
  selectedCenter,
  onSelectCenter,
  onNext,
}: CenterSelectionStepProps) => {
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
