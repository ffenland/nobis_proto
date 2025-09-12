// app/trainer/pt/[id]/[lessonId]/newRecord/StretchingRecordForm.tsx
"use client";

import { useState } from "react";
import type { StretchingExercise } from "@/app/services/exercise/exercise.service";
import type { Equipment } from "@/app/services/fitness-center/equipment.service";
import { getEquipmentDisplayTitle, sortEquipmentByCategory } from "@/app/lib/utils/equipment.utils";

// Form 데이터 타입 - page.tsx의 StretchingFormData와 일치
interface StretchingFormData {
  type: "STRETCHING";
  title: string;
  description?: string;
  isCustomExercise: boolean;
  stretchingExerciseId?: string;
  customExerciseName?: string;
  customExerciseDescription?: string;
  stretchingDescription?: string;
  equipmentIds: string[];
}

interface StretchingRecordFormProps {
  onComplete: (data: StretchingFormData) => void;
  onCancel: () => void;
  nextEntry: number;
  preloadedExercises?: StretchingExercise[]; // 프리로딩된 운동 데이터
  preloadedEquipments?: Equipment[]; // 프리로딩된 장비 데이터
  isExercisesLoading?: boolean; // 운동 데이터 로딩 상태
  isEquipmentsLoading?: boolean; // 장비 데이터 로딩 상태
}

export default function StretchingRecordForm({
  onComplete,
  onCancel,
  nextEntry,
  preloadedExercises = [],
  preloadedEquipments = [],
  isExercisesLoading = false,
  isEquipmentsLoading = false,
}: StretchingRecordFormProps) {
  const [selectedStretching, setSelectedStretching] = useState<string>("");
  const [customStretchingName, setCustomStretchingName] = useState<string>("");
  const [customStretchingDescription, setCustomStretchingDescription] = useState<string>("");
  const [useCustomStretching, setUseCustomStretching] = useState(false);
  const [selectedEquipments, setSelectedEquipments] = useState<Equipment[]>([]);
  const [duration, setDuration] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // 그룹별 장비 그룹화 (새로운 구조)
  const groupEquipmentsByGroup = (equipments: Equipment[]) => {
    const grouped = {} as Record<string, Equipment[]>;
    equipments.forEach((equipment) => {
      const groupName = equipment.group.name;
      if (!grouped[groupName]) grouped[groupName] = [];
      grouped[groupName].push(equipment);
    });
    
    // 각 그룹 내에서 정렬
    Object.keys(grouped).forEach((groupName) => {
      grouped[groupName] = sortEquipmentByCategory(grouped[groupName]);
    });
    
    return grouped;
  };

  // 장비 추가 (중복 방지)
  const addEquipment = (equipment: Equipment) => {
    // 중복 체크 후 무시 (아무 반응 없음)
    if (selectedEquipments.find((eq) => eq.id === equipment.id)) {
      return;
    }
    setSelectedEquipments((prev) => [...prev, equipment]);
  };

  // 장비 제거
  const removeEquipment = (equipmentId: string) => {
    setSelectedEquipments((prev) => prev.filter((eq) => eq.id !== equipmentId));
  };


  // 저장
  const handleSave = () => {
    if (useCustomStretching) {
      if (!customStretchingName.trim()) {
        alert("스트레칭 이름을 입력해주세요");
        return;
      }
      if (!customStretchingDescription.trim()) {
        alert("스트레칭 설명을 입력해주세요");
        return;
      }
    } else {
      if (!selectedStretching) {
        alert("스트레칭을 선택해주세요");
        return;
      }
    }

    const stretching = preloadedExercises.find((s) => s.id === selectedStretching);
    const stretchingTitle = useCustomStretching ? customStretchingName : (stretching?.title || "");

    // StretchingFormData 구조로 생성
    const formData: StretchingFormData = {
      type: "STRETCHING",
      title: stretchingTitle,
      description: description || undefined,
      isCustomExercise: useCustomStretching,
      stretchingExerciseId: useCustomStretching ? undefined : selectedStretching,
      customExerciseName: useCustomStretching ? customStretchingName : undefined,
      customExerciseDescription: useCustomStretching ? customStretchingDescription : undefined,
      stretchingDescription: notes || undefined,
      equipmentIds: selectedEquipments.map((eq) => eq.id),
    };

    onComplete(formData);
  };

  return (
    <div className="space-y-4">
      {/* 스트레칭 선택/입력 모드 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            setUseCustomStretching(false);
            setCustomStretchingName("");
            setCustomStretchingDescription("");
          }}
          className={`flex-1 py-2 px-3 rounded-lg border ${
            !useCustomStretching
              ? "bg-purple-50 border-purple-500 text-purple-700"
              : "bg-white border-gray-300 text-gray-700"
          }`}
        >
          기존 스트레칭 선택
        </button>
        <button
          onClick={() => {
            setUseCustomStretching(true);
            setSelectedStretching("");
          }}
          className={`flex-1 py-2 px-3 rounded-lg border ${
            useCustomStretching
              ? "bg-purple-50 border-purple-500 text-purple-700"
              : "bg-white border-gray-300 text-gray-700"
          }`}
        >
          직접 입력
        </button>
      </div>

      {/* 스트레칭 선택 또는 입력 */}
      {useCustomStretching ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              스트레칭 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={customStretchingName}
              onChange={(e) => setCustomStretchingName(e.target.value)}
              placeholder="예: 전신 스트레칭 루틴"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              스트레칭 설명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={customStretchingDescription}
              onChange={(e) => setCustomStretchingDescription(e.target.value)}
              placeholder="예: 상체와 하체를 전체적으로 이완시키는 스트레칭"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>
        </>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            스트레칭 선택 <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedStretching}
            onChange={(e) => setSelectedStretching(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">
              {isExercisesLoading ? "로딩중..." : "선택하세요"}
            </option>
            {!isExercisesLoading &&
              preloadedExercises.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.title} - {exercise.description}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* 사용 장비 */}
      {(selectedStretching || customStretchingName) && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              사용 장비
            </label>
            {/* 선택된 장비 Badge 표시 */}
            <div className="mb-3">
              <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border border-gray-300 rounded-lg bg-gray-50">
                {selectedEquipments.map((equipment) => (
                  <span
                    key={equipment.id}
                    className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                  >
                    {getEquipmentDisplayTitle(equipment)}
                    <button
                      type="button"
                      onClick={() => removeEquipment(equipment.id)}
                      className="ml-1 text-purple-600 hover:text-purple-800 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {selectedEquipments.length === 0 && (
                  <span className="text-sm text-gray-500 flex items-center">
                    장비를 추가해주세요
                  </span>
                )}
              </div>
            </div>
            
            {/* 장비 추가 드롭다운 */}
            <select
              value=""
              onChange={(e) => {
                const equipment = preloadedEquipments.find(
                  (eq) => eq.id === e.target.value
                );
                if (equipment) {
                  addEquipment(equipment);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">
                {isEquipmentsLoading ? "로딩중..." : "장비 추가..."}
              </option>
              {!isEquipmentsLoading &&
                (() => {
                  // 이미 선택된 장비는 제외
                  const availableEquipments = preloadedEquipments.filter(
                    (eq) => !selectedEquipments.find((selected) => selected.id === eq.id)
                  );
                  const groupedEquipments = groupEquipmentsByGroup(availableEquipments);

                  return Object.entries(groupedEquipments).map(
                    ([groupName, equipments]) => (
                      <optgroup key={groupName} label={groupName}>
                        {equipments.map((equip) => (
                          <option key={equip.id} value={equip.id}>
                            {getEquipmentDisplayTitle(equip)}
                          </option>
                        ))}
                      </optgroup>
                    )
                  );
                })()}
            </select>
          </div>

          {/* 시간/반복 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              시간/반복 (선택)
            </label>
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="예: 각 30초 3세트, 좌우 각 15회"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              설명 (선택)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 운동 후 쿨다운"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              메모 (선택)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="예: 양쪽 균등하게 실시, 통증 없는 범위에서 진행"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
              rows={3}
            />
          </div>
        </>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
        >
          취소
        </button>
        <button
          onClick={handleSave}
          disabled={
            (!selectedStretching && !customStretchingName.trim()) ||
            (useCustomStretching && !customStretchingDescription.trim())
          }
          className="flex-1 py-2.5 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          추가
        </button>
      </div>
    </div>
  );
}
