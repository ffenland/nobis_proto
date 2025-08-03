"use client";

import React, { useState } from "react";
import useSWR from "swr";
import {
  IMachine,
  IEquipment,
  IPtRecordItem,
  IFitnessCenter,
} from "@/app/lib/services/trainer/pt-record.service";
import { EquipmentCategory } from "@prisma/client";
import MachineRecord from "./MachineRecord";
import FreeRecord from "./FreeRecord";
import StretchingRecord from "./StretchingRecord";

interface PtRecordWriterProps {
  ptRecordId: string;
  ptId: string;
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
  const [selectedType, setSelectedType] = useState<
    "machine" | "free" | "stretching" | null
  >(null);

  // PT 기록 아이템 목록 조회
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: ptRecordItemsData,
    error: recordItemsError,
    isLoading: recordItemsLoading,
    mutate: mutateRecordItems,
  } = useSWR<{ items: IPtRecordItem[] }>(
    `/api/trainer/pt-records/${ptRecordId}/items`,
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

  // 웨이트 기구 목록 조회 (WEIGHT 카테고리만)
  const {
    data: weightEquipmentList,
    error: weightEquipmentError,
    isLoading: weightEquipmentLoading,
  } = useSWR<IEquipment[]>(
    `/api/trainer/equipment?centerId=${center.id}&category=${EquipmentCategory.WEIGHT}`,
    fetcher
  );

  // 모든 기구 목록 조회 (스트레칭용)
  const {
    data: allEquipmentList,
  } = useSWR<IEquipment[]>(
    `/api/trainer/equipment?centerId=${center.id}`,
    fetcher
  );

  // 운동 기록 완료 후 콜백
  const handleRecordComplete = async () => {
    try {
      await mutateRecordItems();
      setSelectedType(null);
    } catch (error) {
      console.error("기록 업데이트 실패:", error);
    }
  };





  // 로딩 상태
  if (recordItemsLoading || machinesLoading || weightEquipmentLoading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 에러 상태
  if (recordItemsError || machinesError || weightEquipmentError) {
    return (
      <div className="text-center text-red-500">
        데이터를 불러오는 중 오류가 발생했습니다.
      </div>
    );
  }


  return (
    <div className="space-y-4">
      {/* 운동 기록 추가 */}
      {selectedType === null && (
        <div>
          <h3 className="text-base font-semibold mb-3">운동 추가</h3>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setSelectedType("machine")}
              className="p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="text-center">
                <div className="text-xl mb-1">🏋️</div>
                <div className="text-sm font-medium">머신</div>
              </div>
            </button>

            <button
              onClick={() => setSelectedType("free")}
              className="p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="text-center">
                <div className="text-xl mb-1">💪</div>
                <div className="text-sm font-medium">프리웨이트</div>
              </div>
            </button>

            <button
              onClick={() => setSelectedType("stretching")}
              className="p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="text-center">
                <div className="text-xl mb-1">🧘</div>
                <div className="text-sm font-medium">스트레칭</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 선택된 타입에 따른 기록 컴포넌트 */}
      {selectedType === "machine" && (
        <MachineRecord
          ptRecordId={ptRecordId}
          onComplete={handleRecordComplete}
          machineList={machineList || []}
        />
      )}

      {selectedType === "free" && (
        <FreeRecord
          ptRecordId={ptRecordId}
          onComplete={handleRecordComplete}
          equipmentList={weightEquipmentList || []}
        />
      )}

      {selectedType === "stretching" && (
        <StretchingRecord
          ptRecordId={ptRecordId}
          onComplete={handleRecordComplete}
          equipmentList={allEquipmentList || []}
        />
      )}

      {/* 취소 버튼 - 선택된 타입이 있을 때만 표시 */}
      {selectedType !== null && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setSelectedType(null)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            취소
          </button>
        </div>
      )}
    </div>
  );
};

export default PtRecordWriter;