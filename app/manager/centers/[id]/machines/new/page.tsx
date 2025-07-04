"use client";

import { use, useEffect, useState, useRef } from "react";
import { createMachine, IMachineDetail, IMachineSetting } from "./actions";
import { useRouter } from "next/navigation";

type IParams = Promise<{
  id: string;
}>;

export enum IMachineValueEditState {
  NEW = "NEW",
  EDIT = "EDIT",
  HOLD = "HOLD",
  ADDING = "ADDING",
}

export const CenterMachineNew = (props: { params: IParams }) => {
  const router = useRouter();
  const { id: centerId } = use(props.params);
  const [machine, setMachine] = useState<IMachineDetail>({
    id: "",
    title: "",
    machineSetting: [],
  });
  const [showAddSettingModal, setShowAddSettingModal] = useState(false);
  const [selectedSetting, setSelectedSetting] =
    useState<IMachineSetting | null>(null);
  const [lastAddedValueId, setLastAddedValueId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 머신 설정 추가
  const handleAddSetting = () => {
    setSelectedSetting({
      id: `temp-setting-${Date.now()}`,
      title: "",
      unit: "",
      values: [],
      isNew: true,
    });
    setShowAddSettingModal(true);
  };

  // 머신 설정 값 추가
  const addSettingValue = () => {
    if (!selectedSetting) return;

    const hasEmptyNewValue = selectedSetting.values.some(
      (v) => v.editState === IMachineValueEditState.ADDING && !v.value.trim()
    );
    if (hasEmptyNewValue) return;

    const addingValue = selectedSetting.values.find(
      (v) => v.editState === IMachineValueEditState.ADDING
    );
    if (addingValue) {
      setSelectedSetting((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          values: [
            ...prev.values.map((v) =>
              v.id === addingValue.id
                ? { ...v, editState: IMachineValueEditState.NEW }
                : v
            ),
            {
              id: `temp-value-${Date.now()}`,
              value: "",
              editState: IMachineValueEditState.ADDING,
            },
          ],
        };
      });
      setLastAddedValueId(`temp-value-${Date.now()}`);
    } else {
      const newValueId = `temp-value-${Date.now()}`;
      setSelectedSetting((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          values: [
            ...prev.values,
            {
              id: newValueId,
              value: "",
              editState: IMachineValueEditState.ADDING,
            },
          ],
        };
      });
      setLastAddedValueId(newValueId);
    }
  };

  // 새로 추가된 input에 포커스
  useEffect(() => {
    if (lastAddedValueId && inputRef.current) {
      inputRef.current.focus();
      setLastAddedValueId(null);
    }
  }, [lastAddedValueId]);

  // 머신 설정 값 수정
  const onSettingValueChange = ({
    id,
    value,
    unit,
  }: {
    id: string;
    value?: string;
    unit?: string;
  }) => {
    if (!selectedSetting) return;
    setSelectedSetting((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        unit: unit || prev.unit,
        values: prev.values.map((v) =>
          v.id === id ? { ...v, value: value ?? v.value } : v
        ),
      };
    });
  };

  // 머신 설정 값 삭제
  const removeSettingValue = (valueId: string) => {
    if (!selectedSetting) return;
    setSelectedSetting((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        values: prev.values.filter((value) => value.id !== valueId),
      };
    });
  };

  // 세팅값 저장
  const saveSettingValues = () => {
    if (!machine || !selectedSetting) return;

    const updatedSetting = {
      ...selectedSetting,
      values: selectedSetting.values.map((value) => ({
        ...value,
        editState:
          value.editState === IMachineValueEditState.ADDING
            ? IMachineValueEditState.NEW
            : value.editState,
      })),
    };

    if (!updatedSetting.title.trim()) {
      alert("세팅 이름을 입력해주세요.");
      return;
    }

    setMachine({
      ...machine,
      machineSetting: [
        ...machine.machineSetting,
        {
          ...updatedSetting,
          values: updatedSetting.values.filter((v) => v.value.trim() !== ""),
        },
      ],
    });
    setSelectedSetting(null);
    setShowAddSettingModal(false);
  };

  const handleSave = async () => {
    if (!machine.title.trim()) {
      alert("머신 이름을 입력해주세요.");
      return;
    }

    const result = await createMachine(centerId, machine);
    if (result.ok && result.data?.machineId) {
      router.push(
        `/manager/centers/${centerId}/machines/${result.data.machineId}`
      );
    } else {
      alert(result.error?.message || "머신 생성 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="container mx-auto p-2 space-y-6">
      {/* 기본 정보 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body p-3">
          <h2 className="card-title">Machine 이름</h2>
          <div className="form-control">
            <input
              type="text"
              value={machine.title}
              onChange={(e) =>
                setMachine({ ...machine, title: e.target.value })
              }
              className="font-bold input input-bordered text-lg"
              placeholder="머신 이름을 입력하세요"
            />
          </div>
        </div>
      </div>

      {/* 머신 설정 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body p-3 flex flex-col gap-4 items-center">
          <div className="flex mx-2 justify-start items-center w-full">
            <h2 className="card-title">Machine Settings</h2>
          </div>
          <div className="w-full flex flex-col gap-4">
            {machine.machineSetting.map((setting) => (
              <div key={setting.id} className="flex flex-col gap-2">
                <div className="flex w-full items-center justify-between">
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-start gap-2">
                      <span>세팅 이름 :</span>
                      <span className="font-bold">{setting.title}</span>
                    </div>
                    <div className="flex items-center justify-start gap-2">
                      <span className="">단위 :</span>
                      <span className="font-bold">{setting.unit}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSetting(setting);
                      setShowAddSettingModal(true);
                    }}
                    className="btn btn-sm btn-outline btn-primary"
                  >
                    수정하기
                  </button>
                </div>

                <div className="w-full overflow-x-auto">
                  <div className="flex flex-wrap gap-2 min-w-max">
                    {setting.values.map((value) => (
                      <div
                        key={value.id}
                        className="flex items-center justify-center bg-base-200 rounded w-6 h-6 text-xs"
                      >
                        <span>{value.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 w-1/2">
            <button onClick={handleAddSetting} className="btn btn-primary">
              세팅 추가하기
            </button>
          </div>
        </div>
      </div>

      {/* 버튼 영역 */}
      <div className="flex justify-end gap-2">
        <button className="btn btn-primary" onClick={handleSave}>
          저장하기
        </button>
      </div>

      {/* 세팅값 수정 모달 */}
      <dialog
        id="add-setting-modal"
        className={`modal ${showAddSettingModal ? "modal-open" : ""}`}
      >
        {selectedSetting ? (
          <div className="modal-box w-11/12 max-w-5xl h-[80vh] flex flex-col">
            <h3 className="font-bold text-lg">새로운 세팅 추가하기</h3>
            <p className="py-4">새로운 세팅을 추가합니다.</p>

            {/* 세팅 이름 입력 */}
            <div className="mb-4">
              <label className="label">
                <span className="label-text">세팅 이름</span>
              </label>
              <input
                type="text"
                value={selectedSetting.title}
                onChange={(e) =>
                  setSelectedSetting((prev) => {
                    if (!prev) return null;
                    return { ...prev, title: e.target.value };
                  })
                }
                className="input input-bordered w-full max-w-xs"
                placeholder="세팅 이름 입력 (예: 중량, 높이)"
              />
            </div>

            {/* 단위 입력 */}
            <div className="mb-4">
              <label className="label">
                <span className="label-text">단위</span>
              </label>
              <input
                type="text"
                value={selectedSetting.unit || ""}
                onChange={(e) => {
                  const newUnit = e.target.value;
                  setSelectedSetting((prev) => {
                    if (!prev) return null;
                    return {
                      ...prev,
                      unit: newUnit,
                      values: prev.values.map((v) => ({
                        ...v,
                        unit: newUnit,
                      })),
                    };
                  });
                }}
                className="input input-bordered w-full max-w-xs"
                placeholder="단위 입력 (예: kg, 개)"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {selectedSetting.values.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedSetting.values
                    .sort((a, b) => {
                      if (
                        a.editState === IMachineValueEditState.ADDING &&
                        b.editState !== IMachineValueEditState.ADDING
                      )
                        return -1;
                      if (
                        a.editState !== IMachineValueEditState.ADDING &&
                        b.editState === IMachineValueEditState.ADDING
                      )
                        return 1;
                      return 0;
                    })
                    .map((value) => (
                      <div
                        key={value.id}
                        className={`flex justify-between gap-2 p-2 rounded-lg border-2 ${
                          value.editState === IMachineValueEditState.ADDING
                            ? "border-pink-500"
                            : "border-orange-500"
                        }`}
                      >
                        <div className="flex-1 flex justify-center items-center">
                          <input
                            ref={
                              value.id === lastAddedValueId ? inputRef : null
                            }
                            type="text"
                            value={value.value}
                            onChange={(e) =>
                              onSettingValueChange({
                                id: value.id,
                                value: e.target.value,
                              })
                            }
                            className="w-full bg-transparent rounded-md pl-5"
                            placeholder="값"
                          />
                        </div>
                        <div className="flex justify-center items-center rounded-full bg-white">
                          <button
                            onClick={() => removeSettingValue(value.id)}
                            className="btn btn-ghost btn-xs"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <span>현재 값이 없습니다. 값을 추가해주세요.</span>
                </div>
              )}
            </div>

            <div className="modal-action mt-4">
              <button className="btn btn-primary" onClick={addSettingValue}>
                값 추가
              </button>
              <button className="btn btn-success" onClick={saveSettingValues}>
                현재 속성 저장하기
              </button>
              <button
                className="btn"
                onClick={() => {
                  setSelectedSetting(null);
                  setShowAddSettingModal(false);
                }}
              >
                닫기
              </button>
            </div>
          </div>
        ) : (
          <div className="modal-box">
            <span>세팅값이 없습니다.</span>
          </div>
        )}
        <div
          className="modal-backdrop"
          onClick={() => {
            setSelectedSetting(null);
            setShowAddSettingModal(false);
          }}
        >
          <button>닫기</button>
        </div>
      </dialog>
    </div>
  );
};

export default CenterMachineNew;
