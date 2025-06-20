"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ChangeConfirmModal, ChangeSummary } from "./MachineChangeConfirm";
import {
  compareMachineData,
  convertToChangeSummary,
  normalizeMachineData,
} from "@/app/lib/managerUtils";
import { updateMachine, deleteMachine } from "./actions";

type IParams = Promise<{
  machineId: string;
}>;

export enum IMachineValueEditState {
  NEW = "NEW",
  EDIT = "EDIT",
  HOLD = "HOLD",
  ADDING = "ADDING",
}

// API Route 응답을 기준으로 한 타입 정의
export interface IMachineSettingValue {
  id: string;
  value: string;
  editState: IMachineValueEditState;
}

export interface IMachineSetting {
  id: string;
  title: string;
  unit: string;
  isNew: boolean;
  values: IMachineSettingValue[];
}

export interface IMachineDetail {
  id: string;
  title: string;
  fitnessCenter: {
    id: string;
    title: string;
  } | null;
  machineSetting: IMachineSetting[];
}

// API에서 받아오는 원시 데이터 타입
interface APIResponse {
  id: string;
  title: string;
  fitnessCenter: {
    id: string;
    title: string;
  } | null;
  machineSetting: {
    id: string;
    title: string;
    unit: string;
    values: {
      id: string;
      value: string;
    }[];
  }[];
}

// SWR fetcher 함수
const fetcher = async (url: string): Promise<APIResponse> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

// API 데이터를 내부 타입으로 변환하는 함수
const transformAPIDataToInternal = (apiData: APIResponse): IMachineDetail => {
  return {
    ...apiData,
    machineSetting: apiData.machineSetting.map((setting) => ({
      ...setting,
      isNew: false, // API에서 받아온 데이터는 기존 데이터
      values: setting.values.map((value) => ({
        ...value,
        editState: IMachineValueEditState.HOLD, // 기본값으로 HOLD 설정
      })),
    })),
  };
};

// 값 정렬을 위한 비교 함수
const compareValues = (a: string, b: string) => {
  const numA = parseFloat(a);
  const numB = parseFloat(b);

  // 둘 다 숫자인 경우
  if (!isNaN(numA) && !isNaN(numB)) {
    return numA - numB;
  }

  // 하나만 숫자인 경우 숫자를 앞으로
  if (!isNaN(numA)) return -1;
  if (!isNaN(numB)) return 1;

  // 둘 다 문자열인 경우
  return a.localeCompare(b);
};

// Custom Hook for Machine Detail
function useMachineDetail(machineId: string) {
  const { data, error, isLoading, mutate } = useSWR<APIResponse>(
    machineId ? `/api/manager/machines/${machineId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );

  // API 데이터를 내부 타입으로 변환하고 값 정렬
  const transformedData = data
    ? {
        ...transformAPIDataToInternal(data),
        machineSetting: transformAPIDataToInternal(data).machineSetting.map(
          (setting) => ({
            ...setting,
            values: setting.values.sort((a, b) =>
              compareValues(a.value, b.value)
            ),
          })
        ),
      }
    : null;

  return {
    machine: transformedData,
    isLoading,
    error,
    mutate,
  };
}

const MachineDetailPage = (props: { params: IParams }) => {
  const router = useRouter();
  const { machineId } = use(props.params);
  const {
    machine: originalMachine,
    isLoading,
    error,
    mutate,
  } = useMachineDetail(machineId);

  const [machine, setMachine] = useState<IMachineDetail | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddSettingModal, setShowAddSettingModal] = useState(false);
  const [selectedSetting, setSelectedSetting] =
    useState<IMachineSetting | null>(null);
  const [showChangeConfirmModal, setShowChangeConfirmModal] = useState(false);
  const [changeSummary, setChangeSummary] = useState<ChangeSummary | null>(
    null
  );
  const [lastAddedValueId, setLastAddedValueId] = useState<string | null>(null);
  const [showNoChangesAlert, setShowNoChangesAlert] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // originalMachine이 로드되면 machine state 초기화
  useEffect(() => {
    if (originalMachine && !machine) {
      setMachine(originalMachine);
    }
  }, [originalMachine, machine]);

  // "변경사항 없음" 알림 자동 숨김
  useEffect(() => {
    if (showNoChangesAlert) {
      const timer = setTimeout(() => {
        setShowNoChangesAlert(false);
        router.back();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [showNoChangesAlert, router]);

  // 머신 설정 수정 모달 열기
  const handleEditSetting = useCallback((setting: IMachineSetting) => {
    setSelectedSetting(setting);
    setShowAddSettingModal(true);
  }, []);

  // 중복 값 제거 함수
  const removeDuplicateValues = (values: IMachineSettingValue[]) => {
    const nonEmptyValues = values.filter((v) => v.value.trim() !== "");
    const valueGroups = new Map<string, IMachineSettingValue[]>();

    nonEmptyValues.forEach((value) => {
      const trimmedValue = value.value.trim();
      if (!valueGroups.has(trimmedValue)) {
        valueGroups.set(trimmedValue, []);
      }
      valueGroups.get(trimmedValue)!.push(value);
    });

    const uniqueValues: IMachineSettingValue[] = [];

    valueGroups.forEach((duplicateValues) => {
      if (duplicateValues.length === 1) {
        uniqueValues.push(duplicateValues[0]);
        return;
      }

      let selectedValue: IMachineSettingValue | null = null;

      // 우선순위: HOLD > EDIT > NEW > ADDING
      selectedValue =
        duplicateValues.find(
          (v) => v.editState === IMachineValueEditState.HOLD
        ) ||
        duplicateValues.find(
          (v) => v.editState === IMachineValueEditState.EDIT
        ) ||
        duplicateValues.find(
          (v) => v.editState === IMachineValueEditState.NEW
        ) ||
        duplicateValues.find(
          (v) => v.editState === IMachineValueEditState.ADDING
        ) ||
        duplicateValues[0];

      if (selectedValue) {
        uniqueValues.push(selectedValue);
      }
    });

    return uniqueValues;
  };

  // 머신 설정 추가
  const handleAddSetting = useCallback(() => {
    setSelectedSetting({
      id: `temp-setting-${Date.now()}`,
      title: "",
      unit: "",
      values: [],
      isNew: true,
    });
    setShowAddSettingModal(true);
  }, []);

  // 머신 설정 값 추가
  const addSettingValue = useCallback(() => {
    if (!selectedSetting) return;

    const hasEmptyNewValue = selectedSetting.values.some(
      (v) => v.editState === IMachineValueEditState.ADDING && !v.value.trim()
    );
    if (hasEmptyNewValue) return;

    const addingValue = selectedSetting.values.find(
      (v) => v.editState === IMachineValueEditState.ADDING
    );

    if (addingValue) {
      const newValueId = `temp-value-${Date.now()}`;
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
              id: newValueId,
              value: "",
              editState: IMachineValueEditState.ADDING,
            },
          ],
        };
      });
      setLastAddedValueId(newValueId);
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
  }, [selectedSetting]);

  // 새로 추가된 input에 포커스
  useEffect(() => {
    if (lastAddedValueId) {
      const timer = setTimeout(() => {
        const inputElement = document.querySelector(
          `input[data-value-id="${lastAddedValueId}"]`
        ) as HTMLInputElement;
        if (inputElement) {
          inputElement.focus();
          inputElement.select();
        }
        setLastAddedValueId(null);
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [lastAddedValueId]);

  // 머신 설정 값 수정
  const onSettingValueChange = useCallback(
    ({ id, value, unit }: { id: string; value?: string; unit?: string }) => {
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
    },
    []
  );

  // 머신 설정 값 삭제
  const removeSettingValue = useCallback((valueId: string) => {
    setSelectedSetting((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        values: prev.values.filter((value) => value.id !== valueId),
      };
    });
  }, []);

  // 세팅값 저장
  const saveSettingValues = useCallback(() => {
    if (!machine || !selectedSetting || !originalMachine) return;

    const valuesWithUpdatedState = selectedSetting.values.map((value) => ({
      ...value,
      editState:
        value.editState === IMachineValueEditState.ADDING
          ? IMachineValueEditState.NEW
          : value.editState,
    }));

    const uniqueValues = removeDuplicateValues(valuesWithUpdatedState);

    const updatedSetting = {
      ...selectedSetting,
      values: uniqueValues,
    };

    if (selectedSetting.isNew) {
      if (!updatedSetting.title.trim()) {
        alert("세팅 이름을 입력해주세요.");
        return;
      }

      if (updatedSetting.values.length === 0) {
        alert("최소한 하나의 값을 입력해주세요.");
        return;
      }

      setMachine({
        ...machine,
        machineSetting: [...machine.machineSetting, updatedSetting],
      });
    } else {
      setMachine({
        ...machine,
        machineSetting: machine.machineSetting.map((setting) =>
          setting.id === updatedSetting.id ? updatedSetting : setting
        ),
      });
    }

    setSelectedSetting(null);
    setShowAddSettingModal(false);
  }, [machine, selectedSetting, originalMachine]);

  // 변경사항 확인 및 저장 프로세스
  const handleEdit = useCallback(() => {
    if (!machine || !originalMachine) return;

    const detailedChanges = compareMachineData(originalMachine, machine);

    if (!detailedChanges.hasChanges) {
      setShowNoChangesAlert(true);
      return;
    }

    const changes = convertToChangeSummary(detailedChanges);
    setChangeSummary(changes);
    setShowChangeConfirmModal(true);
  }, [machine, originalMachine]);

  // 데이터 정규화 및 업데이트
  const handleConfirmSave = useCallback(async () => {
    if (!machine || !originalMachine || !changeSummary) return;

    setIsUpdating(true);

    try {
      const normalizedMachine = normalizeMachineData(machine, originalMachine);
      setMachine(normalizedMachine);

      const result = await updateMachine(normalizedMachine.id, changeSummary);

      if (result.success) {
        setShowChangeConfirmModal(false);
        // SWR 캐시 갱신
        await mutate();
        window.location.reload();
      } else {
        alert(result.error || "업데이트에 실패했습니다.");
      }
    } catch (error) {
      console.error("Update failed:", error);
      alert("업데이트 중 오류가 발생했습니다.");
    } finally {
      setIsUpdating(false);
    }
  }, [machine, originalMachine, changeSummary, mutate]);

  // 머신 삭제
  const handleDelete = useCallback(async () => {
    if (!machine) return;

    setIsDeleting(true);

    try {
      const result = await deleteMachine(machine.id);

      if (result.success) {
        setShowDeleteModal(false);
        // 삭제 성공 시 목록 페이지로 이동
        router.back();
      } else {
        alert(result.error || "삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }, [machine, router]);

  // 에러 상태
  if (error) {
    return (
      <div className="container mx-auto p-2 flex flex-col justify-center items-center min-h-64 space-y-4">
        <div className="alert alert-error">
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current flex-shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>데이터를 불러오는데 실패했습니다: {error.message}</span>
          </div>
        </div>
        <button onClick={() => mutate()} className="btn btn-primary">
          다시 시도
        </button>
      </div>
    );
  }

  // 로딩 상태
  if (isLoading || !machine) {
    return (
      <div className="container mx-auto p-2 flex justify-center items-center min-h-64">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2 space-y-6">
      {/* 변경사항 없음 알림 */}
      {showNoChangesAlert && (
        <div className="alert alert-info shadow-lg">
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current flex-shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <span>변경된 값이 없습니다. 3초 후 이전 페이지로 이동합니다.</span>
          </div>
        </div>
      )}

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
                    onClick={() => handleEditSetting(setting)}
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
        <button
          onClick={() => setShowDeleteModal(true)}
          className="btn btn-error"
          disabled={isDeleting}
        >
          {isDeleting ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              삭제 중...
            </>
          ) : (
            "삭제하기"
          )}
        </button>
        <button
          className="btn btn-primary"
          onClick={handleEdit}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              저장 중...
            </>
          ) : (
            "수정하기"
          )}
        </button>
      </div>

      {/* 세팅값 수정 모달 */}
      <dialog
        id="add-setting-modal"
        className={`modal ${showAddSettingModal ? "modal-open" : ""}`}
      >
        {selectedSetting ? (
          <div className="modal-box w-11/12 max-w-5xl h-[80vh] flex flex-col">
            <h3 className="font-bold text-lg">
              {selectedSetting.isNew
                ? "새로운 세팅 추가하기"
                : "세팅값 수정하기"}
            </h3>
            <p className="py-4">
              {selectedSetting.isNew
                ? "새로운 세팅을 추가합니다."
                : `${selectedSetting.title} 세팅값을 수정합니다.`}
            </p>

            {/* 세팅 이름 입력 */}
            {selectedSetting.isNew && (
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
            )}

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
                            : value.editState === IMachineValueEditState.NEW
                            ? "border-orange-500"
                            : value.editState === IMachineValueEditState.EDIT
                            ? "border-green-500"
                            : "border-blue-500"
                        }`}
                      >
                        <div className="flex-1 flex justify-center items-center">
                          <input
                            data-value-id={value.id}
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

      {/* 삭제 확인 모달 */}
      <dialog
        id="delete_modal"
        className={`modal ${showDeleteModal ? "modal-open" : ""}`}
      >
        <div className="modal-box">
          <h3 className="font-bold text-lg">머신 삭제</h3>
          <p className="py-4">정말로 이 머신을 삭제하시겠습니까?</p>
          <div className="modal-action">
            <button
              className="btn btn-error"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  삭제 중...
                </>
              ) : (
                "삭제"
              )}
            </button>
            <button
              className="btn"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              취소
            </button>
          </div>
        </div>
        <div
          className="modal-backdrop"
          onClick={() => setShowDeleteModal(false)}
        >
          <button>닫기</button>
        </div>
      </dialog>

      {/* 변경사항 확인 모달 */}
      {changeSummary && (
        <ChangeConfirmModal
          isOpen={showChangeConfirmModal}
          onClose={() => setShowChangeConfirmModal(false)}
          onConfirm={handleConfirmSave}
          changes={changeSummary}
        />
      )}
    </div>
  );
};

export default MachineDetailPage;
