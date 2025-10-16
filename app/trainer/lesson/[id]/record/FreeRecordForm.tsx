// app/trainer/pt/[id]/[lessonId]/newRecord/FreeRecordForm.tsx
"use client";

import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { Badge } from "@/app/components/ui/Loading";
import type { FreeExercise } from "@/app/services/exercise/exercise.service";
import type { Equipment } from "@/app/services/fitness-center/equipment.service";
import type {
  EquipmentInfo,
  CreateFreeRecordInput,
} from "@/app/services/trainer/lesson.service";

// FreeSetRecord 구조 - schema.prisma와 일치
interface SetRecord {
  id: string; // 고유 ID for React keys
  reps: string;
  weight: string; // 중량 (kg 단위)
  equipments: EquipmentInfo[]; // 장비 상세 정보 배열
}

interface FreeRecordFormProps {
  onComplete: (data: Omit<CreateFreeRecordInput, "entry" | "tempId">) => void;
  onCancel: () => void;
  nextEntry: number;
  preloadedExercises?: FreeExercise[]; // 프리로딩된 운동 데이터
  preloadedEquipments?: Equipment[]; // 프리로딩된 장비 데이터
  isExercisesLoading?: boolean; // 운동 데이터 로딩 상태
  isEquipmentsLoading?: boolean; // 장비 데이터 로딩 상태
}

export default function FreeRecordForm({
  onComplete,
  onCancel,
  nextEntry,
  preloadedExercises = [],
  preloadedEquipments = [],
  isExercisesLoading = false,
  isEquipmentsLoading = false,
}: FreeRecordFormProps) {
  const [selectedExercise, setSelectedExercise] = useState<FreeExercise | null>(
    null
  );
  const [customExerciseName, setCustomExerciseName] = useState<string>("");
  const [customExerciseDescription, setCustomExerciseDescription] =
    useState<string>("");
  const [sets, setSets] = useState<SetRecord[]>([
    { id: `set-${Date.now()}-0`, reps: "", weight: "", equipments: [] },
  ]);
  const [description, setDescription] = useState<string>("");
  const [useCustomExercise, setUseCustomExercise] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 세트 추가
  const addSet = () => {
    if (!selectedExercise && !customExerciseName.trim()) {
      alert("프리 운동을 선택해주세요");
      return;
    }

    const lastSet = sets[sets.length - 1];
    if (!lastSet.reps) {
      alert("현재 세트의 횟수를 입력해주세요");
      return;
    }

    // 이전 세트의 장비와 중량을 기본값으로 복사
    const lastSetEquipments =
      sets.length > 0 ? sets[sets.length - 1].equipments : [];
    const lastSetWeight = sets.length > 0 ? sets[sets.length - 1].weight : "";

    setSets((prevSets) => [
      ...prevSets,
      {
        id: `set-${Date.now()}-${prevSets.length}`,
        reps: "",
        weight: lastSetWeight, // 이전 세트 중량 복사
        equipments: [...lastSetEquipments], // 이전 세트 장비 복사
      },
    ]);
  };

  // 세트 삭제
  const removeSet = (setId: string) => {
    if (sets.length > 1) {
      setSets((prevSets) => prevSets.filter((set) => set.id !== setId));
    }
  };

  // 세트 값 변경
  const updateSetReps = (setId: string, reps: string) => {
    setSets((prevSets) =>
      prevSets.map((set) => (set.id === setId ? { ...set, reps } : set))
    );
  };

  // 세트 중량 변경
  const updateSetWeight = (setId: string, weight: string) => {
    setSets((prevSets) =>
      prevSets.map((set) => (set.id === setId ? { ...set, weight } : set))
    );
  };

  // 세트별 장비 추가
  const addSetEquipment = (setId: string, equipment: Equipment) => {
    setSets((prevSets) =>
      prevSets.map((set) => {
        if (set.id === setId) {
          const exists = set.equipments.some(
            (eq) => eq.equipmentId === equipment.id
          );
          if (!exists) {
            return {
              ...set,
              equipments: [
                ...set.equipments,
                {
                  equipmentId: equipment.id,
                  value: "",
                  notes: "",
                  order: set.equipments.length,
                },
              ],
            };
          }
        }
        return set;
      })
    );
  };

  // 세트별 장비 제거
  const removeSetEquipment = (setId: string, equipmentId: string) => {
    setSets((prevSets) =>
      prevSets.map((set) =>
        set.id === setId
          ? {
              ...set,
              equipments: set.equipments.filter(
                (eq) => eq.equipmentId !== equipmentId
              ),
            }
          : set
      )
    );
  };

  // 세트별 장비 value 업데이트
  const updateEquipmentValue = (
    setId: string,
    equipmentId: string,
    value: string
  ) => {
    setSets((prevSets) =>
      prevSets.map((set) =>
        set.id === setId
          ? {
              ...set,
              equipments: set.equipments.map((eq) =>
                eq.equipmentId === equipmentId ? { ...eq, value } : eq
              ),
            }
          : set
      )
    );
  };

  // 세트별 장비 notes 업데이트
  const updateEquipmentNotes = (
    setId: string,
    equipmentId: string,
    notes: string
  ) => {
    setSets((prevSets) =>
      prevSets.map((set) =>
        set.id === setId
          ? {
              ...set,
              equipments: set.equipments.map((eq) =>
                eq.equipmentId === equipmentId ? { ...eq, notes } : eq
              ),
            }
          : set
      )
    );
  };

  // 세트에서 사용하는 장비 객체들 가져오기
  const getSetEquipments = (
    setEquipments: EquipmentInfo[]
  ): Array<EquipmentInfo & { equipment: Equipment }> => {
    return setEquipments
      .map((eqInfo) => {
        const equipment = preloadedEquipments.find(
          (eq) => eq.id === eqInfo.equipmentId
        );
        if (equipment) {
          return { ...eqInfo, equipment };
        }
        return null;
      })
      .filter(
        (item): item is EquipmentInfo & { equipment: Equipment } =>
          item !== null
      );
  };

  // 저장
  const handleSave = () => {
    if (useCustomExercise) {
      if (!customExerciseName.trim()) {
        alert("운동 이름을 입력해주세요");
        return;
      }
      if (!customExerciseDescription.trim()) {
        alert("운동 설명을 입력해주세요");
        return;
      }
    } else {
      if (!selectedExercise) {
        alert("프리 운동을 선택해주세요");
        return;
      }
    }

    // 마지막 세트 검증
    const lastSet = sets[sets.length - 1];
    if (!lastSet.reps) {
      alert("마지막 세트의 횟수를 입력해주세요");
      return;
    }

    // CreateFreeRecordInput 구조로 생성 (entry, tempId 제외)
    const formData: Omit<CreateFreeRecordInput, "entry" | "tempId"> = {
      type: "FREE",
      title: useCustomExercise ? customExerciseName : selectedExercise!.title,
      description: description || undefined,
      isCustomExercise: useCustomExercise,
      freeExerciseId: useCustomExercise ? undefined : selectedExercise!.id,
      customExerciseName: useCustomExercise ? customExerciseName : undefined,
      customExerciseDescription: useCustomExercise
        ? customExerciseDescription
        : undefined,
      freeSetRecords: sets.map((set, index) => ({
        set: index + 1,
        reps: parseInt(set.reps),
        weight: set.weight ? parseInt(set.weight) : undefined,
        equipments: set.equipments,
      })),
    };

    onComplete(formData);
  };

  return (
    <div className="space-y-4">
      {/* 운동 선택/입력 모드 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            setUseCustomExercise(false);
            setCustomExerciseName("");
          }}
          className={`flex-1 py-2 px-3 rounded-lg border ${
            !useCustomExercise
              ? "bg-green-50 border-green-500 text-green-700"
              : "bg-white border-gray-300 text-gray-700"
          }`}
        >
          기존 운동 선택
        </button>
        <button
          onClick={() => {
            setUseCustomExercise(true);
            setSelectedExercise(null);
            setCustomExerciseDescription("");
          }}
          className={`flex-1 py-2 px-3 rounded-lg border ${
            useCustomExercise
              ? "bg-green-50 border-green-500 text-green-700"
              : "bg-white border-gray-300 text-gray-700"
          }`}
        >
          직접 입력
        </button>
      </div>

      {/* 운동 선택 또는 입력 */}
      {useCustomExercise ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              운동 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={customExerciseName}
              onChange={(e) => setCustomExerciseName(e.target.value)}
              placeholder="예: 인클라인 덤벨 프레스"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              운동 설명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={customExerciseDescription}
              onChange={(e) => setCustomExerciseDescription(e.target.value)}
              placeholder="예: 상체를 15도 기울여 가슴 상부를 중점 타겟"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>
        </>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            운동 선택 <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedExercise?.id || ""}
            onChange={(e) => {
              const exercise = preloadedExercises.find(
                (ex) => ex.id === e.target.value
              );
              setSelectedExercise(exercise || null);
              setSets([
                { id: `set-${Date.now()}-0`, reps: "", weight: "", equipments: [] },
              ]);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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

      {/* 설명 */}
      {(selectedExercise || customExerciseName) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            설명 (선택)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="예: 천천히 컨트롤하며 실시"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      )}

      {/* 세트 관리 */}
      {(selectedExercise || customExerciseName) && (
        <div>
          <div className="mb-3">
            <label className="text-sm font-medium text-gray-700">
              세트 정보 <span className="text-red-500">*</span>
            </label>
          </div>

          {/* 세트 목록 */}
          <div className="space-y-2">
            {sets.map((set, index) => (
              <div
                key={set.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="success" className="text-xs">
                    Set {index + 1}
                  </Badge>
                  {sets.length > 1 && (
                    <button
                      onClick={() => removeSet(set.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* 반복 횟수와 중량 */}
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-600 font-medium">
                      반복 횟수
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={set.reps}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, "");
                        updateSetReps(set.id, value);
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                      placeholder="횟수"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 font-medium">
                      중량 (kg)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={set.weight}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, "");
                        updateSetWeight(set.id, value);
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                      placeholder="중량"
                    />
                  </div>
                </div>

                {/* 세트별 장비 선택 */}
                <div className="mb-3">
                  <label className="text-xs text-gray-600 font-medium mb-2 block">
                    사용 장비
                  </label>

                  {/* 선택된 장비 목록 및 value/notes 입력 */}
                  <div className="mb-2 space-y-2">
                    {getSetEquipments(set.equipments).map((eqInfo) => (
                      <div
                        key={eqInfo.equipmentId}
                        className="p-2 border border-gray-300 rounded bg-white"
                      >
                        {/* 장비 이름과 삭제 버튼 */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            {eqInfo.equipment.title}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              removeSetEquipment(set.id, eqInfo.equipmentId)
                            }
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* value 및 notes 입력 */}
                        <div
                          className={`grid gap-2 ${
                            eqInfo.equipment.unit !== "none"
                              ? "grid-cols-2"
                              : "grid-cols-1"
                          }`}
                        >
                          {eqInfo.equipment.unit !== "none" && (
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">
                                값 ({eqInfo.equipment.unit})
                              </label>
                              <input
                                type="text"
                                value={eqInfo.value || ""}
                                onChange={(e) =>
                                  updateEquipmentValue(
                                    set.id,
                                    eqInfo.equipmentId,
                                    e.target.value
                                  )
                                }
                                placeholder={`${eqInfo.equipment.unit} 입력`}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                              />
                            </div>
                          )}
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">
                              메모 (선택)
                            </label>
                            <input
                              type="text"
                              value={eqInfo.notes || ""}
                              onChange={(e) =>
                                updateEquipmentNotes(
                                  set.id,
                                  eqInfo.equipmentId,
                                  e.target.value
                                )
                              }
                              placeholder="메모 입력"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {set.equipments.length === 0 && (
                      <div className="p-2 border border-gray-300 rounded bg-gray-50 text-center">
                        <span className="text-xs text-gray-500">
                          장비를 추가하세요
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 장비 추가 드롭다운 */}
                  <select
                    value=""
                    onChange={(e) => {
                      const equipment = preloadedEquipments.find(
                        (eq) => eq.id === e.target.value
                      );
                      if (equipment) {
                        addSetEquipment(set.id, equipment);
                      }
                    }}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                  >
                    <option value="">
                      {isEquipmentsLoading ? "로딩중..." : "장비 추가..."}
                    </option>
                    {!isEquipmentsLoading &&
                      preloadedEquipments
                        .filter(
                          (eq) =>
                            !set.equipments.some((e) => e.equipmentId === eq.id)
                        )
                        .map((equip) => (
                          <option key={equip.id} value={equip.id}>
                            {equip.title}
                          </option>
                        ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {sets.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-sm text-gray-500 mb-2">아직 세트가 없습니다</p>
              <button
                onClick={addSet}
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                첫 세트 추가하기
              </button>
            </div>
          )}

          {/* 세트 추가 버튼 - 세트 목록 하단에 위치 */}
          {sets.length > 0 && (
            <div className="mt-3 text-center">
              <button
                onClick={addSet}
                className="inline-flex items-center gap-1 px-4 py-2 text-sm text-green-600 hover:text-green-700 bg-white border border-green-300 rounded-lg hover:bg-green-50 font-medium"
              >
                <Plus className="w-4 h-4" />
                세트 추가
              </button>
            </div>
          )}
        </div>
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
          onClick={() => setShowConfirmModal(true)}
          disabled={
            (!selectedExercise && !customExerciseName.trim()) ||
            (useCustomExercise && !customExerciseDescription.trim()) ||
            sets.length === 0
          }
          className="flex-1 py-2.5 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          기록완료
        </button>
      </div>

      {/* 기록완료 확인 모달 */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              운동 기록 저장
            </h3>
            <p className="text-gray-600 mb-6">
              현재 운동 기록을 저장하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  handleSave();
                }}
                className="flex-1 py-2.5 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
