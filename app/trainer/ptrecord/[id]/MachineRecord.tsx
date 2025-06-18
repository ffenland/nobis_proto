"use client";

import {
  IMachine,
  IMachineRecordData,
  IMachineSetRecord,
  writeMachineRecord,
} from "./actions";
import { MachineExerciseData } from "./PtRecordWriter";
import { useEffect, useState } from "react";
import { matchSearch } from "@/app/components/common/matchSearch";

interface MachineRecordProps {
  onComplete: (data: MachineExerciseData) => void;
  machineList: IMachine[];
  ptRecordId: string;
}

interface SetRecord {
  reps: string;
  settingValues: {
    [settingId: string]: {
      settingId: string;
      valueId: string;
    };
  };
}

export const MachineRecord = ({
  onComplete,
  machineList,
  ptRecordId,
}: MachineRecordProps) => {
  const [query, setQuery] = useState("");
  const [searchedMachines, setSearchedMachines] = useState<IMachine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<IMachine | null>(null);
  const [sets, setSets] = useState<SetRecord[]>([
    {
      reps: "",
      settingValues: {},
    },
  ]);
  const [selectedSetIndex, setSelectedSetIndex] = useState<number | null>(null);
  const [details, setDetails] = useState("");
  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<{
    id: string;
    title: string;
    unit: string;
    values: { id: string; value: string }[];
  } | null>(null);

  // 세트 추가
  const addSet = () => {
    const lastSet = sets[sets.length - 1];
    setSets([
      ...sets,
      {
        reps: "",
        settingValues: { ...lastSet.settingValues },
      },
    ]);
  };

  // 세트 삭제
  const removeSet = (index: number) => {
    setSets(sets.filter((_, i) => i !== index));
  };

  // 세트 값 변경
  const updateSet = (
    index: number,
    field: keyof SetRecord,
    value: string | { settingId: string; valueId: string }
  ) => {
    const newSets = [...sets];
    if (field === "settingValues") {
      const { settingId, valueId } = value as {
        settingId: string;
        valueId: string;
      };
      newSets[index] = {
        ...newSets[index],
        settingValues: {
          ...newSets[index].settingValues,
          [settingId]: { settingId, valueId },
        },
      };
    } else {
      newSets[index] = { ...newSets[index], [field]: value as string };
    }
    setSets(newSets);
  };

  // 설정값 표시 텍스트 생성
  const getSettingDisplayText = (set: SetRecord, settingId: string) => {
    const setting = selectedMachine?.machineSetting?.find(
      (s) => s.id === settingId
    );
    const settingValue = set.settingValues[settingId];
    if (!setting || !settingValue) return `${setting?.title || ""} 선택`;

    const value = setting.values.find((v) => v.id === settingValue.valueId);
    if (value) {
      return `${setting.title} ${value?.value + setting.unit || ""}`;
    } else {
      return `${setting.title} 선택`;
    }
  };

  const handleComplete = async () => {
    if (!selectedMachine) return;

    // 세트별 기록 데이터 구성
    const machineSetRecords: IMachineSetRecord[] = sets.map((set, index) => {
      // settingValues를 MachineSettingValue ID 배열로 변환
      const settingValueIds = Object.values(set.settingValues).map(
        ({ valueId }) => valueId
      );

      // 세트 기록 데이터 구성
      return {
        reps: parseInt(set.reps),
        set: index + 1,
        settingValueIds,
        _meta: {
          setNumber: index + 1,
          settings: Object.values(set.settingValues).map(
            ({ settingId, valueId }) => {
              const setting = selectedMachine.machineSetting?.find(
                (s) => s.id === settingId
              );
              const settingValue = setting?.values.find(
                (v) => v.id === valueId
              );
              return {
                settingId,
                valueId,
                settingTitle: setting?.title || "",
                value: settingValue?.value || "",
                unit: setting?.unit || "",
              };
            }
          ),
        },
      };
    });

    // 최종 데이터 구성
    const recordData: IMachineRecordData = {
      machineId: selectedMachine.id,
      machineName: selectedMachine.title,
      machineSetRecords,
      details,
      _summary: {
        totalSets: sets.length,
        formattedDetails: machineSetRecords
          .map((set) => {
            const settingsText = set._meta?.settings
              .map((s) => `${s.settingTitle} ${s.value}${s.unit}`)
              .join(", ");
            return `${settingsText} ${set.reps}회`;
          })
          .join(", "),
      },
    };

    try {
      const result = await writeMachineRecord(ptRecordId, recordData);
      if (result.ok) {
        // 서버에 정상적으로 기록한 경우, 이 정보를 onComplete 함수에 전달한다.
        // 전달할 내용, 생성된
      } else {
        alert(
          result.error?.message || "머신 운동 기록 작성 중 오류가 발생했습니다."
        );
      }
    } catch (error) {
      console.error("Error writing machine record:", error);
      alert("머신 운동 기록 작성 중 오류가 발생했습니다.");
    }
  };

  // 검색어가 변경될 때마다 검색 실행
  useEffect(() => {
    const results = matchSearch<IMachine>(machineList, "title", query);
    setSearchedMachines(results);
  }, [query, machineList]);

  if (selectedMachine) {
    return (
      <div className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">선택된 머신</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="font-medium">{selectedMachine.title}</span>
            <button
              type="button"
              onClick={() => setSelectedMachine(null)}
              className="btn btn-ghost btn-sm"
            >
              변경
            </button>
          </div>
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

              {/* 머신 설정값들 */}
              <div className="grid grid-cols-2 gap-2">
                {selectedMachine?.machineSetting?.map((setting) => (
                  <div key={setting.id} className="form-control">
                    <label className="label">
                      <span className="label-text">{setting.title}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSetting(setting);
                        setSelectedSetIndex(index);
                        setIsSettingModalOpen(true);
                      }}
                      className="btn btn-outline w-full justify-start"
                    >
                      {getSettingDisplayText(set, setting.id)}
                    </button>
                  </div>
                ))}
              </div>

              {/* 횟수 입력 */}
              <div className="form-control">
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
          ))}

          <button
            type="button"
            onClick={addSet}
            className="btn btn-outline btn-sm"
          >
            세트 추가
          </button>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">추가 설명</span>
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="textarea textarea-bordered h-24"
            placeholder="추가 설명을 입력하세요"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleComplete}
            className="btn btn-primary"
          >
            기록 완료
          </button>
        </div>

        {/* 설정값 선택 모달 */}
        <dialog
          id="setting_modal"
          className={`modal ${isSettingModalOpen ? "modal-open" : ""}`}
        >
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {selectedSetting?.title} 선택
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {selectedSetting?.values.map((value) => (
                <button
                  key={value.id}
                  onClick={() => {
                    if (selectedSetIndex !== null) {
                      updateSet(selectedSetIndex, "settingValues", {
                        settingId: selectedSetting.id,
                        valueId: value.id,
                      });
                    }
                    setIsSettingModalOpen(false);
                  }}
                  className="btn btn-outline"
                >
                  {value.value}
                </button>
              ))}
            </div>
            <div className="modal-action">
              <button
                onClick={() => {
                  setIsSettingModalOpen(false);
                }}
                className="btn"
              >
                닫기
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => {
              setIsSettingModalOpen(false);
            }}
          >
            <button>닫기</button>
          </div>
        </dialog>
      </div>
    );
  } else {
    return (
      <div className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">머신 검색</span>
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="머신 이름을 입력하세요 (초성 검색 가능)"
            className="input input-bordered w-full"
          />
        </div>

        {/* 검색 결과 드롭다운 */}
        {query && (
          <div className="border rounded-lg shadow-lg bg-base-100">
            <div className="max-h-60 overflow-y-auto">
              {searchedMachines.length > 0 ? (
                searchedMachines.map((machine) => (
                  <button
                    key={machine.title}
                    onClick={() => {
                      setSelectedMachine(machine);
                      setQuery("");
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-base-200 focus:bg-base-200"
                  >
                    {machine.title}
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
    );
  }
};

export default MachineRecord;
