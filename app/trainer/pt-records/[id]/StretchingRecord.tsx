"use client";

import { useState, useEffect } from "react";
import {
  IEquipment,
  IStretchingExercise,
} from "@/app/lib/services/pt-record.service";
import { matchSearch } from "@/app/components/common/matchSearch";
import useSWR from "swr";

interface StretchingRecordProps {
  ptRecordId: string;
  onComplete: () => void;
  equipmentList: IEquipment[];
}

interface StretchingRecordData {
  stretchingExerciseId: string;
  description: string;
  selectedEquipments: IEquipment[];
}

// API fetcher 함수
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error("Failed to fetch");
    }
    return res.json();
  });

const StretchingRecord = ({
  ptRecordId,
  onComplete,
  equipmentList,
}: StretchingRecordProps) => {
  const [selectedExercise, setSelectedExercise] =
    useState<IStretchingExercise | null>(null);
  const [description, setDescription] = useState("");
  const [selectedEquipments, setSelectedEquipments] = useState<IEquipment[]>(
    []
  );
  const [query, setQuery] = useState("");
  const [equipmentQuery, setEquipmentQuery] = useState("");
  const [searchedExercises, setSearchedExercises] = useState<
    IStretchingExercise[]
  >([]);
  const [searchedEquipments, setSearchedEquipments] = useState<IEquipment[]>(
    []
  );
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 스트레칭 운동 목록 조회
  const {
    data: stretchingExercises,
    error: exercisesError,
    isLoading: exercisesLoading,
  } = useSWR<IStretchingExercise[]>(
    `/api/trainer/stretching-exercises`,
    fetcher
  );

  // 운동 검색
  useEffect(() => {
    if (stretchingExercises) {
      const results = matchSearch<IStretchingExercise>(
        stretchingExercises,
        "title",
        query
      );
      setSearchedExercises(results);
    }
  }, [query, stretchingExercises]);

  // 기구 검색
  useEffect(() => {
    const results = matchSearch<IEquipment>(
      equipmentList,
      "title",
      equipmentQuery
    );
    setSearchedEquipments(results);
  }, [equipmentQuery, equipmentList]);

  // 운동 선택
  const selectExercise = (exercise: IStretchingExercise) => {
    setSelectedExercise(exercise);
    setQuery("");
    setShowExerciseModal(false);
  };

  // 기구 추가
  const addEquipment = (equipment: IEquipment) => {
    if (!selectedEquipments.find((eq) => eq.id === equipment.id)) {
      setSelectedEquipments([...selectedEquipments, equipment]);
    }
    setEquipmentQuery("");
    setShowEquipmentModal(false);
  };

  // 기구 삭제
  const removeEquipment = (equipmentId: string) => {
    setSelectedEquipments(
      selectedEquipments.filter((eq) => eq.id !== equipmentId)
    );
  };

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

    if (!selectedExercise) {
      alert("스트레칭 운동을 선택해주세요");
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
          title: selectedExercise.title,
          description,
          type: "STRETCHING",
        }),
      });

      if (!ptRecordItemResponse.ok) {
        throw new Error("PT Record Item 생성 실패");
      }

      const ptRecordItem = await ptRecordItemResponse.json();

      // StretchingExerciseRecord 생성
      const equipmentIds = selectedEquipments.map((eq) => eq.id);

      const stretchingRecordResponse = await fetch(
        `/api/trainer/stretching-records`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ptRecordItemId: ptRecordItem.id,
            stretchingExerciseId: selectedExercise.id,
            description,
            equipmentIds,
          }),
        }
      );

      if (!stretchingRecordResponse.ok) {
        throw new Error("스트레칭 기록 생성 실패");
      }

      // 성공 후 초기화
      setSelectedExercise(null);
      setDescription("");
      setSelectedEquipments([]);
      onComplete();
    } catch (error) {
      console.error("스트레칭 기록 생성 실패:", error);
      alert("기록 생성 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (exercisesLoading) {
    return (
      <div className="flex justify-center items-center min-h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (exercisesError) {
    return (
      <div className="text-center text-red-500">
        스트레칭 운동 목록을 불러오는 중 오류가 발생했습니다.
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">스트레칭 기록</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 스트레칭 운동 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            스트레칭 운동
          </label>
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              {selectedExercise ? (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="font-medium text-blue-900">
                    {selectedExercise.title}
                  </div>
                  <div className="text-sm text-blue-700">
                    {selectedExercise.description}
                  </div>
                </div>
              ) : (
                <div className="p-2 border border-gray-300 rounded-md text-gray-500">
                  스트레칭 운동을 선택해주세요
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowExerciseModal(true)}
              className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              선택
            </button>
          </div>
        </div>

        {/* 설명 입력 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            설명 및 주의사항
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="스트레칭 시 주의사항이나 특이사항을 기록해주세요"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </div>

        {/* 사용 기구 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            사용 기구 (선택사항)
          </label>
          <div className="mb-3">
            <div className="flex flex-wrap gap-2">
              {selectedEquipments.map((equipment) => (
                <span
                  key={equipment.id}
                  className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                >
                  {getEquipmentDisplayText(equipment)}
                  <button
                    type="button"
                    onClick={() => removeEquipment(equipment.id)}
                    className="ml-1 text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowEquipmentModal(true)}
            className="text-blue-500 hover:text-blue-700 text-sm"
          >
            + 기구 추가
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
            disabled={isSubmitting || !selectedExercise}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {isSubmitting ? "저장 중..." : "기록 완료"}
          </button>
        </div>
      </form>

      {/* 스트레칭 운동 선택 모달 */}
      {showExerciseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
            <h4 className="text-lg font-semibold mb-4">스트레칭 운동 선택</h4>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="운동명 검색"
              className="w-full p-2 border border-gray-300 rounded-md mb-4"
              autoFocus
            />

            <div className="space-y-2">
              {searchedExercises.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => selectExercise(exercise)}
                  className="w-full p-2 text-left border border-gray-200 rounded-md hover:bg-gray-50"
                >
                  <div className="font-medium">{exercise.title}</div>
                  <div className="text-sm text-gray-600">
                    {exercise.description}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setShowExerciseModal(false);
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

      {/* 기구 선택 모달 */}
      {showEquipmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
            <h4 className="text-lg font-semibold mb-4">기구 선택</h4>

            <input
              type="text"
              value={equipmentQuery}
              onChange={(e) => setEquipmentQuery(e.target.value)}
              placeholder="기구명 검색"
              className="w-full p-2 border border-gray-300 rounded-md mb-4"
              autoFocus
            />

            <div className="space-y-2">
              {searchedEquipments.map((equipment) => (
                <button
                  key={equipment.id}
                  onClick={() => addEquipment(equipment)}
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
                  setShowEquipmentModal(false);
                  setEquipmentQuery("");
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
export default StretchingRecord;
