"use client";

import { IMachine } from "@/app/lib/services/pt-record.service";
import { useEffect, useState } from "react";
import { matchSearch } from "@/app/components/common/matchSearch";
import type { MachineRecordSubmitData } from "./types";
import ExerciseImageUpload from "@/app/components/media/ExerciseImageUpload";
import ExerciseVideoUpload from "@/app/components/media/ExerciseVideoUpload";
import { uploadMediaFiles } from "./uploadMedia";

interface MachineRecordProps {
  ptRecordId: string;
  onComplete: () => void;
  machineList: IMachine[];
  mode?: "create" | "edit";
  ptRecordItemId?: string;
  initialData?: {
    title?: string;
    description?: string;
    machineId?: string;
    sets: Array<{
      id?: string;
      set: number;
      reps: number;
      settingValues: Array<{
        settingId: string;
        value: number;
      }>;
    }>;
  };
  onSubmit?: (data: MachineRecordSubmitData) => Promise<void>;
  existingImages?: Array<{
    id: string;
    cloudflareId: string;
    originalName: string;
    size: number;
  }>;
  existingVideos?: Array<{
    id: string;
    streamId: string;
    originalName: string;
    size: number;
    duration: number;
    status: string;
  }>;
  onRemoveExistingImage?: (imageId: string) => void;
  onRemoveExistingVideo?: (videoId: string) => void;
}

interface SetRecord {
  id: string; // Add unique ID for React keys
  reps: string;
  settingValues: {
    [settingId: string]: {
      settingId: string;
      valueId: string;
    };
  };
}

export const MachineRecord = ({
  ptRecordId,
  onComplete,
  machineList,
  mode = "create",
  initialData,
  onSubmit,
  existingImages = [],
  existingVideos = [],
  onRemoveExistingImage,
  onRemoveExistingVideo,
}: MachineRecordProps) => {
  const [query, setQuery] = useState("");
  const [searchedMachines, setSearchedMachines] = useState<IMachine[]>([]);
  
  // 초기 머신 설정
  const initMachine = initialData?.machineId 
    ? machineList.find(m => m.id === initialData.machineId) || null
    : null;
  
  const [selectedMachine, setSelectedMachine] = useState<IMachine | null>(initMachine);
  
  // 초기 세트 설정
  const initSets = initialData?.sets?.map((set, index) => ({
    id: set.id || `set-${Date.now()}-${index}`, // Use existing ID or generate unique one
    reps: set.reps.toString(),
    settingValues: set.settingValues.reduce((acc, sv) => ({
      ...acc,
      [sv.settingId]: {
        settingId: sv.settingId,
        valueId: sv.value.toString(),
      }
    }), {})
  })) || [{
    id: `set-${Date.now()}-0`,
    reps: "",
    settingValues: {},
  }];
  
  const [sets, setSets] = useState<SetRecord[]>(initSets);
  const [details, setDetails] = useState(initialData?.description || "");
  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<{
    id: string;
    title: string;
    unit: string;
    values: { id: string; value: string }[];
  } | null>(null);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  
  // 미디어 파일 상태
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);

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
    const requiredSettings = selectedMachine.machineSetting || [];
    const missingSettings = requiredSettings.filter(
      (setting) => !lastSet.settingValues[setting.id]
    );

    if (missingSettings.length > 0) {
      alert(`${missingSettings[0].title} 설정을 입력해주세요`);
      return;
    }

    setSets(prevSets => [
      ...prevSets,
      {
        id: `set-${Date.now()}-${prevSets.length}`,
        reps: "",
        settingValues: { ...lastSet.settingValues },
      },
    ]);
  };

  // 세트 삭제
  const removeSet = (setId: string) => {
    if (sets.length > 1) {
      setSets(prevSets => prevSets.filter(set => set.id !== setId));
    }
  };

  // 세트 값 변경 - 함수형 업데이트로 최신 상태 보장
  const updateSet = (
    setId: string,
    field: keyof Omit<SetRecord, 'id'>,
    value: string | { settingId: string; valueId: string }
  ) => {
    setSets(prevSets => 
      prevSets.map(set => {
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

  // 설정값 표시 텍스트 생성
  const getSettingDisplayText = (set: SetRecord, settingId: string) => {
    const setting = selectedMachine?.machineSetting?.find(
      (s) => s.id === settingId
    );
    const settingValue = set.settingValues[settingId];
    if (!setting || !settingValue) return `${setting?.title || ""} 선택`;

    const value = setting.values.find((v) => v.id === settingValue.valueId);
    if (value) {
      return `${value.value}${setting.unit}`;
    } else {
      return `${setting.title} 선택`;
    }
  };

  // 기록 완료
  const handleComplete = async () => {
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
    const requiredSettings = selectedMachine.machineSetting || [];
    const missingSettings = requiredSettings.filter(
      (setting) => !lastSet.settingValues[setting.id]
    );

    if (missingSettings.length > 0) {
      alert(`${missingSettings[0].title} 설정을 입력해주세요`);
      return;
    }

    setIsSubmitting(true);

    try {
      // 세트별 기록 데이터 구성 - 최신 상태를 확실히 사용
      const currentSets = [...sets]; // 현재 상태의 복사본 생성
      const machineSetRecords = currentSets.map((set, index) => {
        const settingValueIds = Object.values(set.settingValues).map(
          ({ valueId }) => valueId
        );

        return {
          reps: parseInt(set.reps),
          set: index + 1,
          settingValueIds,
        };
      });

      // 커스텀 제출 핸들러가 있으면 사용
      if (onSubmit) {
        await onSubmit({
          machineId: selectedMachine.id,
          machineName: selectedMachine.title,
          machineSetRecords,
          details,
          imageFiles,
          videoFiles,
          existingImageIds: existingImages.filter(img => !onRemoveExistingImage || existingImages.find(e => e.id === img.id)).map(img => img.id),
          existingVideoIds: existingVideos.filter(vid => !onRemoveExistingVideo || existingVideos.find(e => e.id === vid.id)).map(vid => vid.id),
        });
      } else if (mode === "create") {
        // 생성 모드: 기존 로직 사용
        const response = await fetch("/api/trainer/machine-set-records", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ptRecordId,
            machineId: selectedMachine.id,
            machineName: selectedMachine.title,
            machineSetRecords,
            details,
          }),
        });

        if (!response.ok) {
          throw new Error("머신 운동 기록 생성 실패");
        }

        const result = await response.json();
        const ptRecordItemId = result.ptRecordItem.id;

        // 미디어 업로드 처리
        if (imageFiles.length > 0 || videoFiles.length > 0) {
          setIsUploadingMedia(true);
          try {
            const uploadResults = await uploadMediaFiles(
              ptRecordId,
              ptRecordItemId,
              imageFiles,
              videoFiles
            );

            if (uploadResults.errors.length > 0) {
              console.error("일부 미디어 업로드 실패:", uploadResults.errors);
              const errorMessage = uploadResults.errors.length === 1
                ? `파일 업로드 실패: ${uploadResults.errors[0]}`
                : `${uploadResults.errors.length}개 파일 업로드 실패:\n${uploadResults.errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`;
              alert(errorMessage);
            }
          } catch (error) {
            console.error("미디어 업로드 중 오류:", error);
            alert("미디어 업로드 중 오류가 발생했습니다. 다시 시도해주세요.");
          } finally {
            setIsUploadingMedia(false);
          }
        }
      } else {
        // 수정 모드: onSubmit 핸들러 필요
        throw new Error("수정 모드는 onSubmit 핸들러가 필요합니다");
      }

      onComplete();
    } catch (error) {
      console.error("Error writing machine record:", error);
      const errorMessage = error instanceof Error ? error.message : `머신 운동 ${mode === "edit" ? "수정" : "기록"} 중 오류가 발생했습니다.`;
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 검색어가 변경될 때마다 검색 실행
  useEffect(() => {
    const results = matchSearch<IMachine>(machineList, "title", query);
    setSearchedMachines(results);
  }, [query, machineList]);

  if (selectedMachine) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            🏋️ 머신 운동 {mode === "edit" ? "수정" : "기록"}
          </h3>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900">
            선택된 머신
          </label>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span className="font-medium text-gray-900">
              {selectedMachine.title}
            </span>
            <button
              type="button"
              onClick={() => setSelectedMachine(null)}
              className="px-3 py-1 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              변경
            </button>
          </div>
        </div>

        {/* 세트 목록 */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900">세트 기록</h4>

          {sets.map((set, index) => (
            <div key={set.id} className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">
                  세트 {index + 1}
                </span>
                {sets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSet(set.id)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                  >
                    삭제
                  </button>
                )}
              </div>

              {/* 머신 설정값들 */}
              <div className="space-y-3">
                {selectedMachine?.machineSetting?.map((setting) => (
                  <div key={setting.id} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {setting.title}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSetting(setting);
                        setSelectedSetId(set.id);
                        setIsSettingModalOpen(true);
                      }}
                      className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-gray-700">
                        {getSettingDisplayText(set, setting.id)}
                      </span>
                    </button>
                  </div>
                ))}
              </div>

              {/* 횟수 입력 */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  횟수 *
                </label>
                <input
                  type="number"
                  value={set.reps}
                  onChange={(e) => updateSet(set.id, "reps", e.target.value)}
                  onBlur={(e) => updateSet(set.id, "reps", e.target.value)} // Ensure value is captured on blur
                  onFocus={(e) => 
                    e.target.addEventListener("wheel", function (e) { 
                      e.preventDefault() 
                    }, { passive: false })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all"
                  placeholder="횟수"
                  min="1"
                />
              </div>
            </div>
          ))}

          {/* 세트 추가 버튼 */}
          <button
            type="button"
            onClick={addSet}
            disabled={!selectedMachine}
            className={`w-full py-3 rounded-lg font-medium transition-all ${
              selectedMachine
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-dashed border-gray-300"
                : "bg-gray-50 text-gray-400 cursor-not-allowed border-2 border-dashed border-gray-200"
            }`}
          >
            + 세트 추가
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900">
            메모 (선택사항)
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all resize-none h-20"
            placeholder="운동에 대한 추가 설명을 입력하세요"
          />
        </div>

        {/* 이미지 업로드 */}
        <ExerciseImageUpload
          maxImages={5}
          onChange={setImageFiles}
          existingImages={existingImages}
          onRemoveExisting={onRemoveExistingImage}
          className="mt-4"
        />

        {/* 동영상 업로드 */}
        <ExerciseVideoUpload
          maxVideos={2}
          maxDurationSeconds={60}
          onChange={setVideoFiles}
          existingVideos={existingVideos}
          onRemoveExisting={onRemoveExistingVideo}
          className="mt-4"
        />

        <button
          type="button"
          onClick={handleComplete}
          disabled={isSubmitting || isUploadingMedia}
          className={`w-full py-4 rounded-lg font-semibold transition-all ${
            isSubmitting || isUploadingMedia
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-700"
          }`}
        >
          {(isSubmitting || isUploadingMedia) ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              <span>{isUploadingMedia ? "미디어 업로드 중..." : "기록 저장 중..."}</span>
            </div>
          ) : (
            "운동 완료"
          )}
        </button>

        {/* 설정값 선택 모달 */}
        {isSettingModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full max-h-96 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedSetting?.title} 선택
                </h3>
              </div>

              <div className="p-4 grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {selectedSetting?.values.map((value) => (
                  <button
                    key={value.id}
                    onClick={() => {
                      if (selectedSetId !== null) {
                        updateSet(selectedSetId, "settingValues", {
                          settingId: selectedSetting.id,
                          valueId: value.id,
                        });
                      }
                      setIsSettingModalOpen(false);
                    }}
                    className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-center"
                  >
                    {value.value}
                    {selectedSetting.unit}
                  </button>
                ))}
              </div>

              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={() => setIsSettingModalOpen(false)}
                  className="w-full py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  } else {
    return (
      <div className="space-y-6 relative">
        {/* 업로드 중 오버레이 */}
        {isUploadingMedia && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-700">미디어 업로드 중...</p>
            </div>
          </div>
        )}
        
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            🏋️ 머신 운동 {mode === "edit" ? "수정" : "기록"}
          </h3>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900">
            머신 검색 *
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="머신 이름을 입력하세요"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* 검색 결과 드롭다운 */}
        {query && (
          <div className="border border-gray-300 rounded-lg shadow-lg bg-white max-h-60 overflow-y-auto">
            {searchedMachines.length > 0 ? (
              searchedMachines.map((machine) => (
                <button
                  key={machine.id}
                  onClick={() => {
                    setSelectedMachine(machine);
                    setQuery("");
                    // 첫 번째 세트의 설정값 초기화
                    setSets([
                      {
                        id: `set-${Date.now()}-0`,
                        reps: "",
                        settingValues: {},
                      },
                    ]);
                  }}
                  className="w-full px-4 py-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-gray-900">
                    {machine.title}
                  </div>
                  {machine.machineSetting &&
                    machine.machineSetting.length > 0 && (
                      <div className="text-sm text-gray-600 mt-1">
                        설정 항목:{" "}
                        {machine.machineSetting.map((s) => s.title).join(", ")}
                      </div>
                    )}
                </button>
              ))
            ) : (
              <div className="px-4 py-4 text-gray-500 text-sm">
                검색 결과가 없습니다
              </div>
            )}
          </div>
        )}

        {!query && (
          <div className="text-center text-gray-500 py-12">
            사용할 머신을 검색해서 선택해주세요
          </div>
        )}
      </div>
    );
  }
};

export default MachineRecord;
