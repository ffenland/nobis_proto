"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { IStretchingExercise } from "@/app/lib/services/pt-record.service";

interface StretchingRecordProps {
  ptRecordId: string;
  onComplete: () => void;
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
}: StretchingRecordProps) => {
  const [selectedExercise, setSelectedExercise] =
    useState<IStretchingExercise | null>(null);
  const [customExerciseName, setCustomExerciseName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [query, setQuery] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchResults, setSearchResults] = useState<IStretchingExercise[]>([]);

  // 스트레칭 운동 목록 조회
  const {
    data: availableExercises,
    error: exercisesError,
    isLoading: exercisesLoading,
    mutate: mutateExercises,
  } = useSWR<IStretchingExercise[]>(
    "/api/trainer/stretching-exercises",
    fetcher
  );

  // 검색 기능
  useEffect(() => {
    if (query.trim() && availableExercises) {
      const filtered = availableExercises.filter(
        (exercise) =>
          exercise.title.toLowerCase().includes(query.toLowerCase()) ||
          exercise.description.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [query, availableExercises]);

  // 기록 완료 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isCustom && !selectedExercise) {
      alert("스트레칭 운동을 선택해주세요");
      return;
    }

    if (isCustom && !customExerciseName.trim()) {
      alert("운동 이름을 입력해주세요");
      return;
    }

    if (!duration) {
      alert("시간을 입력해주세요");
      return;
    }

    setIsSubmitting(true);

    try {
      let stretchingExerciseId = selectedExercise?.id;

      // 사용자 정의 운동인 경우 새로 생성
      if (isCustom) {
        const createExerciseResponse = await fetch(
          "/api/trainer/stretching-exercises",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: customExerciseName,
              description: description || customExerciseName,
            }),
          }
        );

        if (!createExerciseResponse.ok) {
          throw new Error("스트레칭 운동 생성 실패");
        }

        const newExercise = await createExerciseResponse.json();
        stretchingExerciseId = newExercise.id;

        // 스트레칭 운동 목록 갱신
        await mutateExercises();
      }

      // PtRecordItem 생성
      const ptRecordItemResponse = await fetch("/api/trainer/pt-record-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ptRecordId,
          type: "STRETCHING",
          title: isCustom ? customExerciseName : selectedExercise?.title,
          description: description,
          entry: parseInt(duration), // 스트레칭 시간을 entry에 저장
        }),
      });

      if (!ptRecordItemResponse.ok) {
        throw new Error("PtRecordItem 생성 실패");
      }

      const ptRecordItem = await ptRecordItemResponse.json();

      // StretchingExerciseRecord 생성
      const stretchingRecordResponse = await fetch(
        "/api/trainer/stretching-exercise-records",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ptRecordItemId: ptRecordItem.id,
            stretchingExerciseId,
            description: description,
          }),
        }
      );

      if (!stretchingRecordResponse.ok) {
        throw new Error("스트레칭 기록 생성 실패");
      }

      alert("스트레칭이 성공적으로 기록되었습니다!");
      onComplete();
    } catch (error) {
      console.error("Error creating stretching record:", error);
      alert("스트레칭 기록 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 로딩 상태
  if (exercisesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 text-sm">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (exercisesError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 text-red-500">⚠️</div>
          <span className="text-red-800">
            스트레칭 운동 목록을 불러오는 중 오류가 발생했습니다.
          </span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          🧘 스트레칭 기록
        </h3>
      </div>

      {/* 운동 선택 방식 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-900">
          운동 선택 방식
        </label>
        <div className="flex gap-6">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="exerciseType"
              className="w-4 h-4 text-gray-600 border-gray-300 focus:ring-gray-500"
              checked={!isCustom}
              onChange={() => setIsCustom(false)}
            />
            <span className="text-gray-700">기본 운동에서 선택</span>
          </label>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="exerciseType"
              className="w-4 h-4 text-gray-600 border-gray-300 focus:ring-gray-500"
              checked={isCustom}
              onChange={() => setIsCustom(true)}
            />
            <span className="text-gray-700">직접 입력</span>
          </label>
        </div>
      </div>

      {/* 운동 선택/입력 */}
      {!isCustom ? (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900">
            스트레칭 운동 선택 *
          </label>

          {selectedExercise ? (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {selectedExercise.title}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedExercise.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedExercise(null)}
                  className="px-3 py-1 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  변경
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="스트레칭 운동을 검색하세요"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all"
              />

              {query && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((exercise) => (
                    <button
                      key={exercise.id}
                      type="button"
                      onClick={() => {
                        setSelectedExercise(exercise);
                        setQuery("");
                      }}
                      className="w-full px-4 py-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">
                        {exercise.title}
                      </div>
                      <div className="text-sm text-gray-600 truncate mt-1">
                        {exercise.description}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {query && searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                  <div className="px-4 py-4 text-gray-500 text-sm">
                    검색 결과가 없습니다
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900">
            운동 이름 *
          </label>
          <input
            type="text"
            value={customExerciseName}
            onChange={(e) => setCustomExerciseName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all"
            placeholder="예: 목 스트레칭, 어깨 돌리기"
            required={isCustom}
          />
        </div>
      )}

      {/* 시간 입력 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900">
          시간 (초) *
        </label>
        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all"
          placeholder="30"
          min="1"
          required
        />
        <p className="text-sm text-gray-500">권장: 30-60초</p>
      </div>

      {/* 추가 설명 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900">
          메모 (선택사항)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all resize-none h-20"
          placeholder="스트레칭에 대한 추가 설명을 입력하세요"
        />
      </div>

      {/* 제출 버튼 */}
      <button
        type="submit"
        disabled={
          isSubmitting ||
          (!isCustom && !selectedExercise) ||
          (isCustom && !customExerciseName.trim()) ||
          !duration
        }
        className={`w-full py-4 rounded-lg font-semibold transition-all ${
          isSubmitting ||
          (!isCustom && !selectedExercise) ||
          (isCustom && !customExerciseName.trim()) ||
          !duration
            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-700"
        }`}
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            <span>기록 저장 중...</span>
          </div>
        ) : (
          "스트레칭 완료"
        )}
      </button>
    </form>
  );
};

export default StretchingRecord;
