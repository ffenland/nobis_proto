"use client";

import { useState, useEffect } from "react";
import { IWeights } from "@/app/lib/services/pt-record.service";
import { matchSearch } from "@/app/components/common/matchSearch";

interface FreeRecordProps {
  ptRecordId: string;
  onComplete: () => void;
  weightsList: IWeights[];
}

interface SetRecord {
  reps: string;
  selectedWeights: IWeights[];
}

export const FreeRecord = ({
  ptRecordId,
  onComplete,
  weightsList,
}: FreeRecordProps) => {
  const [exerciseName, setExerciseName] = useState("");
  const [description, setDescription] = useState("");
  const [sets, setSets] = useState<SetRecord[]>([
    { reps: "", selectedWeights: [] },
  ]);
  const [query, setQuery] = useState("");
  const [searchedWeights, setSearchedWeights] = useState<IWeights[]>([]);
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
      { reps: "", selectedWeights: [...lastSet.selectedWeights] },
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

  // 도구 추가
  const addWeightToSet = (setIndex: number, weight: IWeights) => {
    const newSets = [...sets];
    if (!newSets[setIndex].selectedWeights.find((w) => w.id === weight.id)) {
      newSets[setIndex].selectedWeights.push(weight);
      setSets(newSets);
    }
    setQuery("");
    setSelectedSetIndex(null);
  };

  // 도구 삭제
  const removeWeightFromSet = (setIndex: number, weightId: string) => {
    const newSets = [...sets];
    newSets[setIndex].selectedWeights = newSets[
      setIndex
    ].selectedWeights.filter((weight) => weight.id !== weightId);
    setSets(newSets);
  };

  // 검색어가 변경될 때마다 검색 실행
  useEffect(() => {
    const results = matchSearch<IWeights>(weightsList, "title", query);
    setSearchedWeights(results);
  }, [query, weightsList]);

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
      // PtRecordItem 생성
      const ptRecordItemResponse = await fetch("/api/trainer/pt-record-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ptRecordId,
          type: "FREE",
          title: exerciseName,
          description,
          entry: 0,
        }),
      });

      if (!ptRecordItemResponse.ok) {
        throw new Error("PtRecordItem 생성 실패");
      }

      const ptRecordItem = await ptRecordItemResponse.json();

      // 각 세트별로 FreeSetRecord 생성
      for (let i = 0; i < sets.length; i++) {
        const set = sets[i];
        const freeSetRecordResponse = await fetch(
          "/api/trainer/free-set-records",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ptRecordItemId: ptRecordItem.id,
              reps: parseInt(set.reps),
              set: i + 1,
              weightIds: set.selectedWeights.map((w) => w.id),
            }),
          }
        );

        if (!freeSetRecordResponse.ok) {
          throw new Error(`세트 ${i + 1} 기록 생성 실패`);
        }
      }

      alert("프리웨이트 운동이 성공적으로 기록되었습니다!");
      onComplete();
    } catch (error) {
      console.error("Error creating free record:", error);
      alert("운동 기록 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          💪 프리웨이트 기록
        </h3>
      </div>

      {/* 운동 이름 입력 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900">
          운동 이름 *
        </label>
        <input
          type="text"
          value={exerciseName}
          onChange={(e) => setExerciseName(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all"
          placeholder="예: 덤벨 프레스, 바벨 컬"
          required
        />
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
          placeholder="운동에 대한 추가 설명을 입력하세요"
        />
      </div>

      {/* 세트 목록 */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">세트 기록</h4>

        {sets.map((set, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">
                세트 {index + 1}
              </span>
              {sets.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSet(index)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                >
                  삭제
                </button>
              )}
            </div>

            {/* 도구 선택 */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                사용 도구 (선택사항)
              </label>

              {/* 선택된 도구들 표시 */}
              {set.selectedWeights.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {set.selectedWeights.map((weight) => (
                    <div
                      key={weight.id}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-sm"
                    >
                      <span>
                        {weight.title} ({weight.weight}kg)
                      </span>
                      <button
                        type="button"
                        onClick={() => removeWeightFromSet(index, weight.id)}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 도구 검색 */}
              <div className="relative">
                <input
                  type="text"
                  value={selectedSetIndex === index ? query : ""}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="도구 이름을 입력하세요"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all"
                  onFocus={() => setSelectedSetIndex(index)}
                  onBlur={() => {
                    setTimeout(() => {
                      if (selectedSetIndex === index) {
                        setSelectedSetIndex(null);
                        setQuery("");
                      }
                    }, 200);
                  }}
                />

                {selectedSetIndex === index && query && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {searchedWeights.length > 0 ? (
                      searchedWeights.map((weight) => (
                        <button
                          key={weight.id}
                          type="button"
                          onClick={() => addWeightToSet(index, weight)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-gray-900">
                              {weight.title}
                            </span>
                            <span className="text-gray-500 text-sm">
                              {weight.weight}kg
                            </span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-500 text-sm">
                        검색 결과가 없습니다
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 횟수 입력 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                횟수 *
              </label>
              <input
                type="number"
                value={set.reps}
                onChange={(e) => updateSetReps(index, e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all"
                placeholder="횟수"
                min="1"
                required
              />
            </div>
          </div>
        ))}

        {/* 세트 추가 버튼 */}
        <button
          type="button"
          onClick={addSet}
          disabled={!exerciseName.trim()}
          className={`w-full py-3 rounded-lg font-medium transition-all ${
            exerciseName.trim()
              ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-dashed border-gray-300"
              : "bg-gray-50 text-gray-400 cursor-not-allowed border-2 border-dashed border-gray-200"
          }`}
        >
          + 세트 추가
        </button>
      </div>

      {/* 제출 버튼 */}
      <button
        type="submit"
        disabled={isSubmitting || !exerciseName.trim()}
        className={`w-full py-4 rounded-lg font-semibold transition-all ${
          isSubmitting || !exerciseName.trim()
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
          "운동 완료"
        )}
      </button>
    </form>
  );
};

export default FreeRecord;
