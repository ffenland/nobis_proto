// app/trainer/lesson/[id]/record/MachineRecordForm.tsx
"use client";

import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { Badge } from "@/app/components/ui/Loading";
import useSWR from "swr";
import type { IMachinesByFitnessCenter } from "@/app/services/fitness-center/machine.service";
import type { CreateMachineRecordInput } from "@/app/services/trainer/lesson.service";

// MachineSetRecord 구조 - schema.prisma와 일치
interface SetRecord {
  id: string; // 고유 ID for React keys
  reps: string;
  settingValues: {
    [settingId: string]: {
      settingId: string;
      valueId: string;
    };
  };
}

interface MachineRecordFormProps {
  onComplete: (data: Omit<CreateMachineRecordInput, "entry" | "tempId">) => void;
  onCancel: () => void;
  nextEntry: number;
  centerId?: string; // parent에서 전달받을 centerId
  preloadedMachines?: IMachinesByFitnessCenter[]; // 프리로딩된 머신 데이터
  isLoading?: boolean; // 로딩 상태
}

export default function MachineRecordForm({
  onComplete,
  onCancel,
  nextEntry,
  centerId,
  preloadedMachines,
  isLoading: isLoadingProp,
}: MachineRecordFormProps) {
  const [selectedMachine, setSelectedMachine] =
    useState<IMachinesByFitnessCenter | null>(null);
  const [sets, setSets] = useState<SetRecord[]>([
    {
      id: `set-${Date.now()}-0`,
      reps: "",
      settingValues: {},
    },
  ]);
  const [description, setDescription] = useState<string>("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 머신 데이터: 프리로딩된 데이터 우선 사용, 없으면 SWR로 조회
  const {
    data: machineList,
    error,
    isLoading,
  } = useSWR<{
    ok: boolean;
    data: IMachinesByFitnessCenter[];
  }>(
    preloadedMachines
      ? null
      : centerId
      ? `/api/fitness-center/${centerId}/machines`
      : null
  );

  // 머신 리스트 데이터 추출 - 프리로딩된 데이터 우선
  const machines = preloadedMachines || machineList?.data || [];

  // 세트 추가
  const addSet = () => {
    if (!selectedMachine) {
      alert("머신을 먼저 선택해주세요");
      return;
    }

    const lastSet = sets[sets.length - 1];
    if (!lastSet.reps) {
      alert("현재 세트의 횟수를 입력해주세요");
      return;
    }

    // 필수 설정값들이 모두 입력되었는지 확인
    const requiredSettings = selectedMachine.settings || [];
    const missingSettings = requiredSettings.filter(
      (setting) => !lastSet.settingValues[setting.id]
    );

    if (missingSettings.length > 0) {
      alert(`${missingSettings[0].name} 설정을 입력해주세요`);
      return;
    }

    setSets((prevSets) => [
      ...prevSets,
      {
        id: `set-${Date.now()}-${prevSets.length}`,
        reps: "",
        settingValues: { ...lastSet.settingValues }, // 이전 세트 설정값 복사
      },
    ]);
  };

  // 세트 삭제
  const removeSet = (setId: string) => {
    if (sets.length > 1) {
      setSets((prevSets) => prevSets.filter((set) => set.id !== setId));
    }
  };

  // 세트 값 변경 - 함수형 업데이트로 최신 상태 보장
  const updateSet = (
    setId: string,
    field: keyof Omit<SetRecord, "id">,
    value: string | { settingId: string; valueId: string }
  ) => {
    setSets((prevSets) =>
      prevSets.map((set) => {
        if (set.id !== setId) return set;

        if (field === "settingValues") {
          const { settingId, valueId } = value as {
            settingId: string;
            valueId: string;
          };
          return {
            ...set,
            settingValues: {
              ...set.settingValues,
              [settingId]: { settingId, valueId },
            },
          };
        } else {
          return { ...set, [field]: value as string };
        }
      })
    );
  };

  // 저장
  const handleSave = () => {
    if (!selectedMachine) {
      alert("머신을 선택해주세요");
      return;
    }

    // 마지막 세트 검증
    const lastSet = sets[sets.length - 1];
    if (!lastSet.reps) {
      alert("마지막 세트의 횟수를 입력해주세요");
      return;
    }

    // 필수 설정값들이 모두 입력되었는지 확인
    const requiredSettings = selectedMachine.settings || [];
    for (const set of sets) {
      const missingSettings = requiredSettings.filter(
        (setting) => !set.settingValues[setting.id]
      );

      if (missingSettings.length > 0) {
        alert(`모든 세트의 ${missingSettings[0].name} 설정을 입력해주세요`);
        return;
      }
    }

    // CreateMachineRecordInput 구조로 생성 (entry, tempId 제외)
    const formData: Omit<CreateMachineRecordInput, "entry" | "tempId"> = {
      type: "MACHINE",
      title: selectedMachine.name,
      description: description || undefined,
      machineId: selectedMachine.id,
      machineSetRecords: sets.map((set, index) => ({
        set: index + 1,
        reps: parseInt(set.reps),
        settingValueIds: Object.values(set.settingValues).map(
          ({ valueId }) => valueId
        ),
      })),
    };

    onComplete(formData);
  };

  // 로딩 상태 처리
  if (!centerId) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">센터 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }

  // 프리로딩 데이터가 없고 SWR로 로딩 중인 경우만 로딩 표시
  if (!preloadedMachines && isLoading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="text-gray-600 mt-2">머신 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (!preloadedMachines && error) {
    return (
      <div className="text-center py-4">
        <p className="text-red-600">머신 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 머신 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          머신 선택 <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedMachine?.id || ""}
          onChange={(e) => {
            const machine = machines.find((m) => m.id === e.target.value);
            setSelectedMachine(machine || null);
            // 머신 변경 시 세트 초기화
            setSets([
              {
                id: `set-${Date.now()}-0`,
                reps: "",
                settingValues: {},
              },
            ]);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{isLoadingProp ? "로딩중..." : "선택하세요"}</option>
          {!isLoadingProp &&
            machines.map((machine) => (
              <option key={machine.id} value={machine.id}>
                {machine.name}
              </option>
            ))}
        </select>
      </div>

      {/* 설명 */}
      {selectedMachine && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            설명 (선택)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="예: 가슴 상부 집중"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      )}

      {/* 세트 관리 */}
      {selectedMachine && (
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
                  <Badge variant="info" className="text-xs">
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

                {/* 반복 횟수와 설정값 */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
                        updateSet(set.id, "reps", value);
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      placeholder="횟수"
                    />
                  </div>
                  {selectedMachine.settings.map((setting) => (
                    <div key={setting.id}>
                      <label className="text-xs text-gray-600 font-medium">
                        {setting.name} {setting.unit && `(${setting.unit})`}
                      </label>
                      <select
                        value={set.settingValues[setting.id]?.valueId || ""}
                        onChange={(e) =>
                          updateSet(set.id, "settingValues", {
                            settingId: setting.id,
                            valueId: e.target.value,
                          })
                        }
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">선택</option>
                        {setting.possibleValues
                          ?.slice()
                          .sort((a, b) => {
                            // 문자열에서 숫자 부분 추출
                            const aMatch = a.value.match(/^(\d+\.?\d*)/);
                            const bMatch = b.value.match(/^(\d+\.?\d*)/);

                            // 둘 다 숫자로 시작하는 경우 숫자로 정렬
                            if (aMatch && bMatch) {
                              const aNum = parseFloat(aMatch[1]);
                              const bNum = parseFloat(bMatch[1]);
                              return aNum - bNum;
                            }

                            // 그 외의 경우 문자열로 정렬
                            return a.value.localeCompare(b.value);
                          })
                          .map((val) => (
                            <option key={val.id} value={val.id}>
                              {val.value}
                              {setting.unit}
                            </option>
                          ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {sets.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-sm text-gray-500 mb-2">아직 세트가 없습니다</p>
              <button
                onClick={addSet}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
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
                className="inline-flex items-center gap-1 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 font-medium"
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
          disabled={!selectedMachine || sets.length === 0}
          className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
                className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
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
