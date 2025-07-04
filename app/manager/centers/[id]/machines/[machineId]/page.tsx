// app/manager/centers/[id]/facilities/machine/[machineId]/page.tsx - Part 1
"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";

// 타입 정의
interface MachineSettingValue {
  id: string;
  value: string;
  isNew?: boolean;
  isDeleted?: boolean;
}

interface MachineSetting {
  id: string;
  title: string;
  unit: string;
  values: MachineSettingValue[];
  isNew?: boolean;
  isDeleted?: boolean;
}

interface MachineDetail {
  id: string;
  title: string;
  fitnessCenter: {
    id: string;
    title: string;
  } | null;
  machineSetting: MachineSetting[];
  photos?: {
    id: string;
    publicUrl: string;
  }[];
}

interface MachineUpdateData {
  title?: string;
  machineSetting?: {
    id?: string;
    title: string;
    unit: string;
    isNew?: boolean;
    values: {
      id?: string;
      value: string;
      isNew?: boolean;
    }[];
  }[];
}

// SWR fetcher
const fetcher = async (url: string): Promise<MachineDetail> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

// 페이지 컴포넌트
export default function MachineDetailPage({
  params,
}: {
  params: Promise<{ id: string; machineId: string }>;
}) {
  const router = useRouter();
  const { id: centerId, machineId } = use(params);

  // SWR로 데이터 관리
  const {
    data: originalMachine,
    error,
    isLoading,
    mutate,
  } = useSWR<MachineDetail>(`/api/manager/machines/${machineId}`, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  // 로컬 상태
  const [machine, setMachine] = useState<MachineDetail | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSettingModal, setShowSettingModal] = useState(false);
  const [editingSetting, setEditingSetting] = useState<MachineSetting | null>(
    null
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 원본 데이터가 로드되면 로컬 상태 초기화
  useEffect(() => {
    if (originalMachine && !machine) {
      setMachine(originalMachine);
    }
  }, [originalMachine, machine]);

  // 새 설정 추가
  const handleAddSetting = useCallback(() => {
    const newSetting: MachineSetting = {
      id: `temp-${Date.now()}`,
      title: "",
      unit: "",
      values: [],
      isNew: true,
    };
    setEditingSetting(newSetting);
    setShowSettingModal(true);
  }, []);

  // 기존 설정 수정
  const handleEditSetting = useCallback((setting: MachineSetting) => {
    setEditingSetting({
      ...setting,
      values: setting.values.map((v) => ({ ...v })),
    });
    setShowSettingModal(true);
  }, []);

  // 설정에 값 추가
  const addValueToSetting = useCallback(() => {
    if (!editingSetting) return;

    const newValue: MachineSettingValue = {
      id: `temp-value-${Date.now()}`,
      value: "",
      isNew: true,
    };

    setEditingSetting({
      ...editingSetting,
      values: [...editingSetting.values, newValue],
    });
  }, [editingSetting]);

  // 설정 값 수정
  const updateSettingValue = useCallback(
    (valueId: string, newValue: string) => {
      if (!editingSetting) return;

      setEditingSetting({
        ...editingSetting,
        values: editingSetting.values.map((v) =>
          v.id === valueId ? { ...v, value: newValue } : v
        ),
      });
    },
    [editingSetting]
  );

  // 설정 값 삭제
  const removeValueFromSetting = useCallback(
    (valueId: string) => {
      if (!editingSetting) return;

      setEditingSetting({
        ...editingSetting,
        values: editingSetting.values.filter((v) => v.id !== valueId),
      });
    },
    [editingSetting]
  );

  // 설정 저장
  const saveSetting = useCallback(() => {
    if (!editingSetting || !machine) return;

    if (!editingSetting.title.trim()) {
      alert("설정 이름을 입력해주세요.");
      return;
    }

    if (!editingSetting.unit.trim()) {
      alert("단위를 입력해주세요.");
      return;
    }

    const validValues = editingSetting.values.filter(
      (v) => v.value.trim() !== ""
    );

    if (validValues.length === 0) {
      alert("최소 하나의 값을 입력해주세요.");
      return;
    }

    const updatedSetting = {
      ...editingSetting,
      values: validValues,
    };

    if (editingSetting.isNew) {
      // 새 설정 추가
      setMachine({
        ...machine,
        machineSetting: [...machine.machineSetting, updatedSetting],
      });
    } else {
      // 기존 설정 수정
      setMachine({
        ...machine,
        machineSetting: machine.machineSetting.map((s) =>
          s.id === updatedSetting.id ? updatedSetting : s
        ),
      });
    }

    setEditingSetting(null);
    setShowSettingModal(false);
  }, [editingSetting, machine]);

  // 설정 삭제
  const deleteSetting = useCallback(
    (settingId: string) => {
      if (!machine) return;

      if (confirm("이 설정을 삭제하시겠습니까?")) {
        setMachine({
          ...machine,
          machineSetting: machine.machineSetting.filter(
            (s) => s.id !== settingId
          ),
        });
      }
    },
    [machine]
  );

  // 변경사항 확인
  const hasChanges = useCallback(() => {
    if (!originalMachine || !machine) return false;

    // 제목 변경 확인
    if (originalMachine.title !== machine.title) return true;

    // 설정 개수 변경 확인
    if (originalMachine.machineSetting.length !== machine.machineSetting.length)
      return true;

    // 설정 내용 변경 확인
    for (const currentSetting of machine.machineSetting) {
      if (currentSetting.isNew) return true;

      const originalSetting = originalMachine.machineSetting.find(
        (s) => s.id === currentSetting.id
      );
      if (!originalSetting) return true;

      if (originalSetting.title !== currentSetting.title) return true;
      if (originalSetting.unit !== currentSetting.unit) return true;

      if (originalSetting.values.length !== currentSetting.values.length)
        return true;

      for (const currentValue of currentSetting.values) {
        if (currentValue.isNew) return true;

        const originalValue = originalSetting.values.find(
          (v) => v.id === currentValue.id
        );
        if (!originalValue || originalValue.value !== currentValue.value)
          return true;
      }
    }

    return false;
  }, [originalMachine, machine]);
  // 머신 저장
  const saveMachine = useCallback(async () => {
    if (!machine || !hasChanges()) {
      alert("변경된 내용이 없습니다.");
      return;
    }

    setIsUpdating(true);

    try {
      const updateData: MachineUpdateData = {
        title: machine.title,
        machineSetting: machine.machineSetting.map((setting) => ({
          id: setting.isNew ? undefined : setting.id,
          title: setting.title,
          unit: setting.unit,
          isNew: setting.isNew,
          values: setting.values.map((value) => ({
            id: value.isNew ? undefined : value.id,
            value: value.value,
            isNew: value.isNew,
          })),
        })),
      };

      const response = await fetch(`/api/manager/machines/${machineId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (result.success) {
        alert("머신이 성공적으로 수정되었습니다.");
        await mutate(); // SWR 캐시 갱신
        router.push(`/manager/centers/${centerId}/facilities/machine`);
      } else {
        alert(result.error || "저장에 실패했습니다.");
      }
    } catch (error) {
      console.error("Update error:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsUpdating(false);
    }
  }, [machine, hasChanges, machineId, mutate, router, centerId]);

  // 머신 삭제
  const deleteMachine = useCallback(async () => {
    if (!machine) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/manager/machines/${machineId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        alert("머신이 성공적으로 삭제되었습니다.");
        router.push(`/manager/centers/${centerId}/facilities/machine`);
      } else {
        alert(result.error || "삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }, [machine, machineId, router, centerId]);

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20">
          <div className="text-red-600 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            데이터를 불러올 수 없습니다
          </h3>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button
            onClick={() => mutate()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 데이터가 없는 상태
  if (!machine) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            머신을 찾을 수 없습니다
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 헤더 */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">머신 수정</h1>
          <p className="text-gray-600 mt-2">
            {machine.fitnessCenter?.title} - {machine.title}
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            href={`/manager/centers/${centerId}/facilities/machine`}
            className="bg-gray-100 text-gray-900 px-6 py-3 rounded-md hover:bg-gray-200 transition-colors font-medium"
          >
            목록으로
          </Link>
        </div>
      </div>

      {/* 머신 이름 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">머신 이름</h3>
        <input
          type="text"
          value={machine.title}
          onChange={(e) => setMachine({ ...machine, title: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="머신 이름을 입력하세요"
        />
      </div>

      {/* 머신 설정 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">머신 설정</h3>
          <button
            onClick={handleAddSetting}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            새 설정 추가
          </button>
        </div>

        {machine.machineSetting.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            등록된 설정이 없습니다. 새 설정을 추가해보세요.
          </div>
        ) : (
          <div className="space-y-4">
            {machine.machineSetting.map((setting) => (
              <div
                key={setting.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {setting.title}
                    </h4>
                    <p className="text-sm text-gray-600">
                      단위: {setting.unit}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditSetting(setting)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => deleteSetting(setting.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {setting.values.map((value) => (
                    <span
                      key={value.id}
                      className="inline-block bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm"
                    >
                      {value.value}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 저장/삭제 버튼 */}
      <div className="flex justify-between">
        <button
          onClick={() => setShowDeleteModal(true)}
          disabled={isDeleting}
          className="bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {isDeleting ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              삭제 중...
            </>
          ) : (
            "머신 삭제"
          )}
        </button>

        <button
          onClick={saveMachine}
          disabled={isUpdating || !hasChanges()}
          className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isUpdating ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              저장 중...
            </>
          ) : (
            "변경사항 저장"
          )}
        </button>
      </div>
      {/* 설정 수정 모달 */}
      {showSettingModal && editingSetting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingSetting.isNew ? "새 설정 추가" : "설정 수정"}
              </h3>

              {/* 설정 이름 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  설정 이름
                </label>
                <input
                  type="text"
                  value={editingSetting.title}
                  onChange={(e) =>
                    setEditingSetting({
                      ...editingSetting,
                      title: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="예: 중량, 높이, 속도 등"
                />
              </div>

              {/* 단위 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  단위
                </label>
                <input
                  type="text"
                  value={editingSetting.unit}
                  onChange={(e) =>
                    setEditingSetting({
                      ...editingSetting,
                      unit: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="예: kg, cm, km/h 등"
                />
              </div>

              {/* 값 목록 */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    설정값 목록
                  </label>
                  <button
                    onClick={addValueToSetting}
                    className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors text-sm"
                  >
                    값 추가
                  </button>
                </div>

                {editingSetting.values.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                    설정값이 없습니다. 값을 추가해보세요.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {editingSetting.values.map((value, index) => (
                      <div
                        key={value.id}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="text"
                          value={value.value}
                          onChange={(e) =>
                            updateSettingValue(value.id, e.target.value)
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={`값 ${index + 1}`}
                        />
                        <button
                          onClick={() => removeValueFromSetting(value.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 모달 버튼 */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setEditingSetting(null);
                    setShowSettingModal(false);
                  }}
                  className="bg-gray-100 text-gray-900 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={saveSetting}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                머신 삭제 확인
              </h3>
              <p className="text-gray-600 mb-6">
                정말로 이 머신을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="bg-gray-100 text-gray-900 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={deleteMachine}
                  disabled={isDeleting}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
