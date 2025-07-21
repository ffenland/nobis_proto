"use client";

import { useState, useEffect } from "react";
import { IEquipment } from "@/app/lib/services/pt-record.service";
import { matchSearch } from "@/app/components/common/matchSearch";

interface FreeRecordProps {
  ptRecordId: string;
  onComplete: () => void;
  equipmentList: IEquipment[];
}

interface SetRecord {
  reps: string;
  selectedEquipments: IEquipment[];
}

const FreeRecord = ({
  ptRecordId,
  onComplete,
  equipmentList,
}: FreeRecordProps) => {
  const [exerciseName, setExerciseName] = useState("");
  const [description, setDescription] = useState("");
  const [sets, setSets] = useState<SetRecord[]>([
    { reps: "", selectedEquipments: [] },
  ]);
  const [query, setQuery] = useState("");
  const [searchedEquipments, setSearchedEquipments] = useState<IEquipment[]>(
    []
  );
  const [selectedSetIndex, setSelectedSetIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 세트 추가
  const addSet = () => {
    if (!exerciseName.trim()) {
      alert("운동 이름을 입력해주세요");
      return;
    }

    const lastSet = sets[sets.length - 1];
    if (!lastSet.reps) {
      alert("현재 세트의 횟수를 입력해주세요");
      return;
    }

    setSets([
      ...sets,
      { reps: "", selectedEquipments: [...lastSet.selectedEquipments] },
    ]);
  };

  // 세트 삭제
  const removeSet = (index: number) => {
    if (sets.length > 1) {
      setSets(sets.filter((_, i) => i !== index));
    }
  };

  // 세트 값 변경
  const updateSetReps = (index: number, reps: string) => {
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], reps };
    setSets(newSets);
  };

  // 기구 추가
  const addEquipmentToSet = (setIndex: number, equipment: IEquipment) => {
    const newSets = [...sets];
    if (
      !newSets[setIndex].selectedEquipments.find((eq) => eq.id === equipment.id)
    ) {
      newSets[setIndex].selectedEquipments.push(equipment);
      setSets(newSets);
    }
    setQuery("");
    setSelectedSetIndex(null);
  };

  // 기구 삭제
  const removeEquipmentFromSet = (setIndex: number, equipmentId: string) => {
    const newSets = [...sets];
    newSets[setIndex].selectedEquipments = newSets[
      setIndex
    ].selectedEquipments.filter((equipment) => equipment.id !== equipmentId);
    setSets(newSets);
  };

  // 검색어가 변경될 때마다 검색 실행
  useEffect(() => {
    const results = matchSearch<IEquipment>(equipmentList, "title", query);
    setSearchedEquipments(results);
  }, [query, equipmentList]);

  // 기구 표시 텍스트 생성
  const getEquipmentDisplayText = (equipment: IEquipment) => {
    const value = equipment.primaryValue;
    const unit = equipment.primaryUnit;

    if (value && unit) {
      return `${equipment.title} (${value}${unit})`;
    }
    return equipment.title;
  };

  // 기록 완료 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!exerciseName.trim()) {
      alert("운동 이름을 입력해주세요");
      return;
    }

    const lastSet = sets[sets.length - 1];
    if (!lastSet.reps) {
      alert("마지막 세트의 횟수를 입력해주세요");
      return;
    }

    setIsSubmitting(true);

    try {
      // PT Record Item 생성
      const ptRecordItemResponse = await fetch(`/api/trainer/pt-record-items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ptRecordId,
          title: exerciseName,
          description,
          type: "FREE",
        }),
      });

      if (!ptRecordItemResponse.ok) {
        throw new Error("PT Record Item 생성 실패");
      }

      const ptRecordItem = await ptRecordItemResponse.json();

      // 각 세트별로 FreeSetRecord 생성
      for (let i = 0; i < sets.length; i++) {
        const set = sets[i];
        const equipmentIds = set.selectedEquipments.map((eq) => eq.id);

        const freeSetRecordResponse = await fetch(
          `/api/trainer/free-set-records`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ptRecordItemId: ptRecordItem.id,
              reps: parseInt(set.reps),
              set: i + 1,
              equipmentIds,
            }),
          }
        );

        if (!freeSetRecordResponse.ok) {
          throw new Error(`${i + 1}번째 세트 기록 생성 실패`);
        }
      }

      // 성공 후 초기화
      setExerciseName("");
      setDescription("");
      setSets([{ reps: "", selectedEquipments: [] }]);
      onComplete();
    } catch (error) {
      console.error("프리웨이트 기록 생성 실패:", error);
      alert("기록 생성 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">프리웨이트 기록</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 운동 이름 입력 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            운동 이름
          </label>
          <input
            type="text"
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            placeholder="예: 벤치프레스, 데드리프트"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        {/* 설명 입력 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            설명 (선택사항)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="운동에 대한 추가 설명이나 주의사항"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </div>

        {/* 세트 입력 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            세트 기록
          </label>
          {sets.map((set, index) => (
            <div
              key={index}
              className="mb-4 p-4 border border-gray-200 rounded-md"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{index + 1}세트</span>
                {sets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSet(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    삭제
                  </button>
                )}
              </div>

              {/* 횟수 입력 */}
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">횟수</label>
                <input
                  type="number"
                  value={set.reps}
                  onChange={(e) => updateSetReps(index, e.target.value)}
                  placeholder="횟수"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  min="1"
                  required
                />
              </div>

              {/* 선택된 기구들 */}
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">
                  선택된 기구
                </label>
                <div className="flex flex-wrap gap-2">
                  {set.selectedEquipments.map((equipment) => (
                    <span
                      key={equipment.id}
                      className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {getEquipmentDisplayText(equipment)}
                      <button
                        type="button"
                        onClick={() =>
                          removeEquipmentFromSet(index, equipment.id)
                        }
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* 기구 추가 */}
              <div>
                <button
                  type="button"
                  onClick={() => setSelectedSetIndex(index)}
                  className="text-blue-500 hover:text-blue-700 text-sm"
                >
                  + 기구 추가
                </button>
              </div>
            </div>
          ))}

          {/* 세트 추가 버튼 */}
          <button
            type="button"
            onClick={addSet}
            className="w-full p-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-800"
          >
            + 세트 추가
          </button>
        </div>

        {/* 제출 버튼 */}
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onComplete}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {isSubmitting ? "저장 중..." : "기록 완료"}
          </button>
        </div>
      </form>

      {/* 기구 검색 모달 */}
      {selectedSetIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
            <h4 className="text-lg font-semibold mb-4">기구 선택</h4>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="기구명 검색"
              className="w-full p-2 border border-gray-300 rounded-md mb-4"
              autoFocus
            />

            <div className="space-y-2">
              {searchedEquipments.map((equipment) => (
                <button
                  key={equipment.id}
                  onClick={() => addEquipmentToSet(selectedSetIndex, equipment)}
                  className="w-full p-2 text-left border border-gray-200 rounded-md hover:bg-gray-50"
                >
                  <div className="font-medium">{equipment.title}</div>
                  <div className="text-sm text-gray-600">
                    {equipment.primaryValue && equipment.primaryUnit && (
                      <span>
                        {equipment.primaryValue}
                        {equipment.primaryUnit}
                      </span>
                    )}
                    {equipment.description && (
                      <span className="ml-2">- {equipment.description}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setSelectedSetIndex(null);
                  setQuery("");
                }}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default FreeRecord;
