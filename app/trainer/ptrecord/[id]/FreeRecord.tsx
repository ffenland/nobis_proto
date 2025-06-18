"use client";
import { useState, useEffect } from "react";
import { IWeights } from "./actions";
import { FreeExerciseData } from "./PtRecordWriter";
import { matchSearch } from "@/app/components/common/matchSearch";
import AlertModal from "@/app/components/common/alertModal";

interface FreeRecordProps {
  onComplete: (data: FreeExerciseData) => void;
  weightsList: IWeights[];
}

interface SetRecord {
  weight: string;
  reps: string;
  tools: IWeights[]; // 도구를 배열로 변경
}

export const FreeRecord = ({ onComplete, weightsList }: FreeRecordProps) => {
  const [query, setQuery] = useState("");
  const [searchedTools, setSearchedTools] = useState<IWeights[]>([]);
  const [exerciseName, setExerciseName] = useState("");
  const [sets, setSets] = useState<SetRecord[]>([
    { weight: "", reps: "", tools: [] },
  ]);
  const [selectedSetIndex, setSelectedSetIndex] = useState<number | null>(null);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: "",
  });
  // 세트 추가
  const addSet = () => {
    if (!exerciseName) {
      setAlertModal({
        isOpen: true,
        message: "운동 이름을 입력해주세요",
      });
      return;
    }

    const lastSet = sets[sets.length - 1];
    if (!lastSet.weight || !lastSet.reps) {
      setAlertModal({
        isOpen: true,
        message: "누락된 기록이 있습니다. 확인해주세요",
      });
      return;
    }

    setSets([...sets, { ...lastSet, reps: "" }]);
  };

  // 세트 삭제
  const removeSet = (index: number) => {
    setSets(sets.filter((_, i) => i !== index));
  };

  // 세트 값 변경
  const updateSet = (index: number, field: keyof SetRecord, value: string) => {
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], [field]: value };
    setSets(newSets);
  };

  // 도구 추가
  const addToolToSet = (setIndex: number, tool: IWeights) => {
    const newSets = [...sets];
    if (!newSets[setIndex].tools.find((t) => t.id === tool.id)) {
      newSets[setIndex].tools.push(tool);
      setSets(newSets);
    }
  };

  // 도구 삭제
  const removeToolFromSet = (setIndex: number, toolId: string) => {
    const newSets = [...sets];
    newSets[setIndex].tools = newSets[setIndex].tools.filter(
      (tool) => tool.id !== toolId
    );
    setSets(newSets);
  };

  // 검색어가 변경될 때마다 검색 실행
  useEffect(() => {
    const results = matchSearch<IWeights>(weightsList, "title", query);
    setSearchedTools(results);
  }, [query, weightsList]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseName) {
      setAlertModal({
        isOpen: true,
        message: "운동 이름을 입력해주세요",
      });
      return;
    }

    const lastSet = sets[sets.length - 1];
    if (!lastSet.weight || !lastSet.reps) {
      setAlertModal({
        isOpen: true,
        message: "누락된 기록이 있습니다. 확인해주세요",
      });
      return;
    }
    const details = sets
      .map((set) => `${set.weight}kg ${set.reps}회`)
      .join(", ");

    onComplete({
      type: "free",
      name: exerciseName,
      sets: sets.length.toString(),
      reps: sets.map((set) => set.reps).join(", "),
      details,
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 운동 이름 입력 */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">운동 이름</span>
          </label>
          <input
            type="text"
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            className="input input-bordered w-full"
            placeholder="운동 이름을 입력하세요"
          />
        </div>

        {/* 세트 목록 */}
        <div className="flex flex-col gap-2">
          {sets.map((set, index) => (
            <div
              key={index}
              className="w-full flex flex-col gap-2 p-4 border rounded-lg"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">세트 {index + 1}</span>
                {sets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSet(index)}
                    className="btn btn-ghost btn-sm"
                  >
                    삭제
                  </button>
                )}
              </div>

              {/* 도구 선택 */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">도구 선택 (선택사항)</span>
                </label>
                <div className="flex flex-col gap-2">
                  {/* 선택된 도구들 표시 */}
                  {set.tools.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {set.tools.map((tool) => (
                        <div key={tool.id} className="badge badge-lg gap-2 p-4">
                          <span>{tool.title}</span>
                          <button
                            type="button"
                            onClick={() => removeToolFromSet(index, tool.id)}
                            className="btn btn-ghost btn-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 도구 검색 */}
                  <div className="flex-1">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="도구 이름을 입력하세요 (초성 검색 가능)"
                      className="input input-bordered w-full"
                      onFocus={() => setSelectedSetIndex(index)}
                    />
                    {selectedSetIndex === index && query && (
                      <div className="border rounded-lg shadow-lg bg-base-100 mt-2">
                        <div className="max-h-60 overflow-y-auto">
                          {searchedTools.length > 0 ? (
                            searchedTools.map((tool) => (
                              <button
                                key={tool.id}
                                type="button"
                                onClick={() => {
                                  addToolToSet(index, tool);
                                  setQuery("");
                                  setSelectedSetIndex(null);
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-base-200 focus:bg-base-200"
                              >
                                {tool.title}
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-gray-500">
                              검색 결과가 없습니다
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 무게와 횟수 입력 */}
              <div className="flex items-center gap-2">
                <div className="form-control flex-1">
                  <label className="label">
                    <span className="label-text">무게(kg)</span>
                  </label>
                  {set.tools.length === 1 && set.tools[0].hasFixedWeight ? (
                    <div className="input input-bordered w-full flex items-center justify-start">
                      {set.tools[0].fixedWeight}kg
                    </div>
                  ) : (
                    <input
                      type="number"
                      value={set.weight}
                      onChange={(e) =>
                        updateSet(index, "weight", e.target.value)
                      }
                      className="input input-bordered w-full"
                      placeholder="무게"
                    />
                  )}
                </div>

                <div className="form-control flex-1">
                  <label className="label">
                    <span className="label-text">횟수</span>
                  </label>
                  <input
                    type="number"
                    value={set.reps}
                    onChange={(e) => updateSet(index, "reps", e.target.value)}
                    className="input input-bordered w-full"
                    placeholder="횟수"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addSet}
            className="btn btn-outline btn-sm"
          >
            세트 추가
          </button>
        </div>

        <div className="w-full flex justify-center">
          <button type="submit" className="btn btn-primary w-full">
            기록 완료
          </button>
        </div>
      </form>
      <AlertModal
        isOpen={alertModal.isOpen}
        message={alertModal.message}
        onClose={() => setAlertModal({ isOpen: false, message: "" })}
      />
    </>
  );
};

export default FreeRecord;
