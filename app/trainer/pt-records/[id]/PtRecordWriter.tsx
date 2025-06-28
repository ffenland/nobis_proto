"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import {
  IMachine,
  IWeights,
  IPtRecordItem,
  IFitnessCenter,
} from "@/app/lib/services/pt-record.service";
import MachineRecord from "./MachineRecord";
import FreeRecord from "./FreeRecord";
import StretchingRecord from "./StretchingRecord";

interface PtRecordWriterProps {
  ptRecordId: string;
  center: IFitnessCenter;
}

// API fetcher 함수
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error("Failed to fetch");
    }
    return res.json();
  });

const PtRecordWriter = ({ ptRecordId, center }: PtRecordWriterProps) => {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<
    "machine" | "free" | "stretching" | null
  >(null);

  // PT 기록 아이템 목록 조회
  const {
    data: ptRecordItemsData,
    error: recordItemsError,
    isLoading: recordItemsLoading,
    mutate: mutateRecordItems,
  } = useSWR<{ items: IPtRecordItem[] }>(
    `/api/trainer/pt-record-items/${ptRecordId}`,
    fetcher
  );

  // 머신 목록 조회
  const {
    data: machineList,
    error: machinesError,
    isLoading: machinesLoading,
  } = useSWR<IMachine[]>(
    `/api/trainer/machines?centerId=${center.id}`,
    fetcher
  );

  // 도구 목록 조회
  const {
    data: weightsList,
    error: weightsError,
    isLoading: weightsLoading,
  } = useSWR<IWeights[]>(`/api/trainer/weights?centerId=${center.id}`, fetcher);

  // 운동 기록 완료 후 콜백
  const handleRecordComplete = async () => {
    try {
      await mutateRecordItems();
      setSelectedType(null);
    } catch (error) {
      console.error("기록 업데이트 실패:", error);
    }
  };

  // 운동 타입별 아이콘
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "MACHINE":
        return "🏋️";
      case "FREE":
        return "💪";
      case "STRETCHING":
        return "🧘";
      default:
        return "🏃";
    }
  };

  // 운동 타입별 제목 생성
  const getRecordTitle = (item: IPtRecordItem) => {
    switch (item.type) {
      case "MACHINE":
        const firstMachineRecord = item.machineSetRecords?.[0];
        if (
          firstMachineRecord?.settingValues?.[0]?.machineSetting?.machine?.title
        ) {
          return firstMachineRecord.settingValues[0].machineSetting.machine
            .title;
        }
        return item.title || "머신 운동";
      case "FREE":
        return item.title || "프리웨이트";
      case "STRETCHING":
        const firstStretchingRecord = item.stretchingExerciseRecords?.[0];
        if (firstStretchingRecord?.stretchingExercise?.title) {
          return firstStretchingRecord.stretchingExercise.title;
        }
        return item.title || "스트레칭";
      default:
        return item.title || "운동";
    }
  };

  // 로딩 상태
  if (recordItemsLoading || machinesLoading || weightsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 text-sm">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (recordItemsError || machinesError || weightsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border border-red-200 rounded-lg p-6 max-w-md mx-4">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 text-red-500">⚠️</div>
            <p className="text-gray-800">
              데이터를 불러오는 중 오류가 발생했습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const recordItems = ptRecordItemsData?.items || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">운동 기록</h1>
            <p className="text-gray-600 mt-1">{center.title}</p>
          </div>
          <button
            onClick={() => {
              if (selectedType === null) {
                router.back();
              } else {
                setSelectedType(null);
              }
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {selectedType === null ? "뒤로가기" : "운동 선택으로"}
          </button>
        </div>

        {/* 기존 운동 기록 목록 */}
        {recordItems.length > 0 && selectedType === null && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              오늘의 운동 기록
            </h2>
            <div className="space-y-3">
              {recordItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                >
                  <span className="text-2xl">{getTypeIcon(item.type)}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {getRecordTitle(item)}
                    </p>
                    {item.description && (
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                    {item.type === "MACHINE"
                      ? `${item.machineSetRecords?.length || 0}세트`
                      : item.type === "FREE"
                      ? `${item.freeSetRecords?.length || 0}세트`
                      : "완료"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 운동 타입 선택 또는 운동 기록 폼 */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6">
            {selectedType === null ? (
              <>
                <h2 className="text-lg font-semibold text-gray-900 mb-6">
                  운동 추가하기
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={() => setSelectedType("machine")}
                    className="p-6 border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all group"
                  >
                    <div className="flex flex-col items-center space-y-3">
                      <span className="text-3xl group-hover:scale-110 transition-transform">
                        🏋️
                      </span>
                      <span className="font-medium text-gray-900">
                        머신 운동
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedType("free")}
                    className="p-6 border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all group"
                  >
                    <div className="flex flex-col items-center space-y-3">
                      <span className="text-3xl group-hover:scale-110 transition-transform">
                        💪
                      </span>
                      <span className="font-medium text-gray-900">
                        프리웨이트
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedType("stretching")}
                    className="p-6 border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all group"
                  >
                    <div className="flex flex-col items-center space-y-3">
                      <span className="text-3xl group-hover:scale-110 transition-transform">
                        🧘
                      </span>
                      <span className="font-medium text-gray-900">
                        스트레칭
                      </span>
                    </div>
                  </button>
                </div>
              </>
            ) : (
              <div>
                {selectedType === "machine" && machineList && (
                  <MachineRecord
                    ptRecordId={ptRecordId}
                    onComplete={handleRecordComplete}
                    machineList={machineList}
                  />
                )}
                {selectedType === "free" && weightsList && (
                  <FreeRecord
                    ptRecordId={ptRecordId}
                    onComplete={handleRecordComplete}
                    weightsList={weightsList}
                  />
                )}
                {selectedType === "stretching" && (
                  <StretchingRecord
                    ptRecordId={ptRecordId}
                    onComplete={handleRecordComplete}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PtRecordWriter;
