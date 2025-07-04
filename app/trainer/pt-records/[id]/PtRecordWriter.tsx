"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import {
  IMachine,
  IEquipment,
  IPtRecordItem,
  IFitnessCenter,
} from "@/app/lib/services/pt-record.service";
import { EquipmentCategory } from "@prisma/client";
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
    error: allEquipmentError,
    isLoading: allEquipmentLoading,
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
        return (
          firstStretchingRecord?.stretchingExercise?.title ||
          item.title ||
          "스트레칭"
        );
      default:
        return item.title || "운동";
    }
  };

  // 기구 표시 텍스트 생성 (타입 오류 수정)
  const getEquipmentDisplayText = (equipment: {
    primaryValue: number | null;
    primaryUnit: string | null;
    title: string;
  }) => {
    const value = equipment.primaryValue;
    const unit = equipment.primaryUnit;

    if (value && unit) {
      return `${value}${unit}`;
    }
    return equipment.title;
  };

  // 세트 정보 포맷팅
  const formatSetInfo = (item: IPtRecordItem) => {
    switch (item.type) {
      case "MACHINE":
        return item.machineSetRecords?.map((record, idx) => (
          <div key={record.id} className="text-sm text-gray-600">
            {record.set}세트: {record.reps}회 -{" "}
            {record.settingValues
              ?.map(
                (sv) =>
                  `${sv.machineSetting.title} ${sv.value}${sv.machineSetting.unit}`
              )
              .join(", ")}
          </div>
        ));
      case "FREE":
        return item.freeSetRecords?.map((record, idx) => (
          <div key={record.id} className="text-sm text-gray-600">
            {record.set}세트: {record.reps}회 -{" "}
            {record.equipments
              ?.map((eq) => `${eq.title} ${getEquipmentDisplayText(eq)}`)
              .join(", ")}
          </div>
        ));
      case "STRETCHING":
        return item.stretchingExerciseRecords?.map((record, idx) => (
          <div key={record.id} className="text-sm text-gray-600">
            {record.stretchingExercise.title}
            {record.equipments && record.equipments.length > 0 && (
              <span>
                {" "}
                - {record.equipments.map((eq) => eq.title).join(", ")}
              </span>
            )}
          </div>
        ));
      default:
        return <div className="text-sm text-gray-600">{item.description}</div>;
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

  const ptRecordItems = ptRecordItemsData?.items || [];

  return (
    <div className="space-y-6">
      {/* 기존 기록 목록 */}
      {ptRecordItems.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">운동 기록</h3>
          <div className="space-y-4">
            {ptRecordItems.map((item) => (
              <div
                key={item.id}
                className="p-4 border border-gray-200 rounded-md"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getTypeIcon(item.type)}</span>
                    <span className="font-medium text-gray-900">
                      {getRecordTitle(item)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {item.entry}번째 운동
                  </span>
                </div>
                <div className="space-y-1">{formatSetInfo(item)}</div>
                {item.description && (
                  <div className="text-sm text-gray-600 mt-2">
                    {item.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 운동 기록 추가 */}
      {selectedType === null && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">운동 기록 추가</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setSelectedType("machine")}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="text-center">
                <div className="text-2xl mb-2">🏋️</div>
                <div className="font-medium">머신 운동</div>
                <div className="text-sm text-gray-600">
                  머신을 사용한 운동 기록
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedType("free")}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="text-center">
                <div className="text-2xl mb-2">💪</div>
                <div className="font-medium">프리웨이트</div>
                <div className="text-sm text-gray-600">
                  덤벨, 바벨 등을 사용한 운동
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedType("stretching")}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="text-center">
                <div className="text-2xl mb-2">🧘</div>
                <div className="font-medium">스트레칭</div>
                <div className="text-sm text-gray-600">
                  스트레칭 및 유연성 운동
                </div>
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
    </div>
  );
};

export default PtRecordWriter;
