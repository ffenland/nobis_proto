"use client";

import { useState, useEffect } from "react";
import { MapPin, ChevronLeft } from "lucide-react";
import useSWR from "swr";
import type { GetTrainersResult } from "@/app/lib/services/manager/direct-registration.service";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface TrainerSelectProps {
  onSelect: (trainer: GetTrainersResult[0]) => void;
  onBack: () => void;
}

export default function TrainerSelect({ onSelect, onBack }: TrainerSelectProps) {
  const [selectedCenter, setSelectedCenter] = useState<string | null>(null);
  
  const { data: trainers, isLoading } = useSWR<GetTrainersResult>(
    "/api/manager/direct-registration/trainers",
    fetcher
  );

  // 센터별로 트레이너 그룹화
  const trainersByCenter = trainers?.reduce((acc, trainer) => {
    const centerKey = trainer.fitnessCenter?.id || "no-center";
    if (!acc[centerKey]) {
      acc[centerKey] = {
        center: trainer.fitnessCenter,
        trainers: []
      };
    }
    acc[centerKey].trainers.push(trainer);
    return acc;
  }, {} as Record<string, { center: GetTrainersResult[0]["fitnessCenter"], trainers: GetTrainersResult[] }>);

  const filteredTrainers = selectedCenter && trainersByCenter
    ? trainersByCenter[selectedCenter]?.trainers || []
    : trainers || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-4 h-4" />
          이전 단계
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">트레이너 선택</h2>
        
        {/* 센터 필터 */}
        {trainersByCenter && Object.keys(trainersByCenter).length > 1 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              센터 필터
            </label>
            <select
              value={selectedCenter || ""}
              onChange={(e) => setSelectedCenter(e.target.value || null)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">전체 센터</option>
              {Object.entries(trainersByCenter).map(([key, group]) => (
                <option key={key} value={key}>
                  {group.center?.title || "센터 미지정"}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p>• 기존 수업을 담당할 트레이너를 선택하세요.</p>
          <p>• 트레이너의 소속 센터가 자동으로 적용됩니다.</p>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-4">
          <p className="text-gray-600">트레이너 목록을 불러오는 중...</p>
        </div>
      )}

      {filteredTrainers.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">트레이너 목록</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredTrainers.map((trainer) => (
              <div
                key={trainer.id}
                className="border rounded-lg p-4 hover:bg-gray-50 hover:border-blue-400 cursor-pointer transition-colors"
                onClick={() => onSelect(trainer)}
              >
                <div className="space-y-2">
                  <div className="font-medium">{trainer.user.username}</div>
                  {trainer.fitnessCenter && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      {trainer.fitnessCenter.title}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredTrainers.length === 0 && !isLoading && (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600">
            {selectedCenter ? "선택한 센터에 트레이너가 없습니다." : "등록된 트레이너가 없습니다."}
          </p>
        </div>
      )}
    </div>
  );
}