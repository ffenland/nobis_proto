"use client";

import { useState, useEffect } from "react";
import { IEquipment } from "@/app/lib/services/pt-record.service";
import { matchSearch } from "@/app/components/common/matchSearch";
import useSWR, { mutate } from "swr";
import type { FreeRecordSubmitData } from "./types";
import type { FreeExerciseList } from "@/app/lib/services/free-exercise.service";
import ExerciseImageUpload from "@/app/components/media/ExerciseImageUpload";
import ExerciseVideoUpload from "@/app/components/media/ExerciseVideoUpload";
import { uploadMediaFiles } from "./uploadMedia";

interface FreeRecordProps {
  ptRecordId: string;
  onComplete: () => void;
  equipmentList: IEquipment[];
  mode?: "create" | "edit";
  ptRecordItemId?: string;
  initialData?: {
    title?: string;
    description?: string;
    freeExerciseId?: string;
    sets: Array<{
      id?: string;
      set: number;
      reps: number;
      equipments: IEquipment[];
    }>;
  };
  onSubmit?: (data: FreeRecordSubmitData) => Promise<void>;
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
  selectedEquipments: IEquipment[];
}

// API fetcher 함수
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error("Failed to fetch");
    }
    return res.json();
  });

const FreeRecord = ({
  ptRecordId,
  onComplete,
  equipmentList,
  mode = "create",
  initialData,
  onSubmit,
  existingImages = [],
  existingVideos = [],
  onRemoveExistingImage,
  onRemoveExistingVideo,
}: FreeRecordProps) => {
  const [selectedExercise, setSelectedExercise] = useState<FreeExerciseList[0] | null>(null);
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [sets, setSets] = useState<SetRecord[]>(
    initialData?.sets?.map((set, index) => ({
      id: set.id || `set-${Date.now()}-${index}`,
      reps: set.reps.toString(),
      selectedEquipments: set.equipments,
    })) || [{ id: `set-${Date.now()}-0`, reps: "", selectedEquipments: [] }]
  );
  const [query, setQuery] = useState("");
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [searchedEquipments, setSearchedEquipments] = useState<IEquipment[]>(
    []
  );
  const [searchedExercises, setSearchedExercises] = useState<FreeExerciseList>([]);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  
  // 미디어 파일 상태
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);

  // 프리 운동 목록 조회
  const {
    data: freeExercises,
    error: exercisesError,
    isLoading: exercisesLoading,
  } = useSWR<FreeExerciseList>(
    `/api/trainer/free-exercises`,
    fetcher
  );

  // 초기 운동 설정 (수정 모드)
  useEffect(() => {
    if (mode === "edit" && initialData?.freeExerciseId && freeExercises) {
      const exercise = freeExercises.find(
        e => e.id === initialData.freeExerciseId
      );
      if (exercise) {
        setSelectedExercise(exercise);
      }
    }
  }, [mode, initialData, freeExercises]);

  // 운동 검색
  useEffect(() => {
    if (freeExercises) {
      const results = matchSearch<FreeExerciseList[0]>(
        freeExercises,
        "title",
        exerciseQuery
      );
      setSearchedExercises(results);
    }
  }, [exerciseQuery, freeExercises]);

  // 운동 선택
  const selectExercise = (exercise: FreeExerciseList[0]) => {
    setSelectedExercise(exercise);
    setExerciseQuery("");
    setShowExerciseModal(false);
  };

  // 새 운동 생성
  const createNewExercise = async (title: string) => {
    if (isCreatingExercise) return;
    
    setIsCreatingExercise(true);
    
    try {
      const response = await fetch('/api/trainer/free-exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '운동 생성 실패');
      }
      
      const newExercise = await response.json();
      setSelectedExercise(newExercise);
      setShowExerciseModal(false);
      setExerciseQuery("");
      
      // SWR 캐시 업데이트
      mutate('/api/trainer/free-exercises');
    } catch (error) {
      console.error('운동 생성 실패:', error);
      alert(error instanceof Error ? error.message : '운동 추가 중 오류가 발생했습니다.');
    } finally {
      setIsCreatingExercise(false);
    }
  };

  // 세트 추가
  const addSet = () => {
    if (!selectedExercise) {
      alert("프리 운동을 선택해주세요");
      return;
    }

    const lastSet = sets[sets.length - 1];
    if (!lastSet.reps) {
      alert("현재 세트의 횟수를 입력해주세요");
      return;
    }

    setSets(prevSets => [
      ...prevSets,
      { 
        id: `set-${Date.now()}-${prevSets.length}`,
        reps: "", 
        selectedEquipments: [...lastSet.selectedEquipments] 
      },
    ]);
  };

  // 세트 삭제
  const removeSet = (setId: string) => {
    if (sets.length > 1) {
      setSets(prevSets => prevSets.filter(set => set.id !== setId));
    }
  };

  // 세트 값 변경
  const updateSetReps = (setId: string, reps: string) => {
    setSets(prevSets => 
      prevSets.map(set => 
        set.id === setId ? { ...set, reps } : set
      )
    );
  };

  // 기구 추가
  const addEquipmentToSet = (setId: string, equipment: IEquipment) => {
    setSets(prevSets => 
      prevSets.map(set => {
        if (set.id === setId && !set.selectedEquipments.find(eq => eq.id === equipment.id)) {
          return {
            ...set,
            selectedEquipments: [...set.selectedEquipments, equipment]
          };
        }
        return set;
      })
    );
    setQuery("");
    setSelectedSetId(null);
  };

  // 기구 삭제
  const removeEquipmentFromSet = (setId: string, equipmentId: string) => {
    setSets(prevSets => 
      prevSets.map(set => 
        set.id === setId 
          ? {
              ...set,
              selectedEquipments: set.selectedEquipments.filter(eq => eq.id !== equipmentId)
            }
          : set
      )
    );
  };

  // 검색어가 변경될 때마다 검색 실행
  useEffect(() => {
    const results = matchSearch<IEquipment>(equipmentList, "title", query);
    setSearchedEquipments(results);
  }, [query, equipmentList]);

  // 기구 표시 텍스트 생성
  const getEquipmentDisplayText = (equipment: IEquipment) => {
    const value = equipment.primaryValue;
    const unit = equipment.primaryUnit;

    if (value && unit) {
      return `${equipment.title} (${value}${unit})`;
    }
    return equipment.title;
  };

  // 기록 완료 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedExercise) {
      alert("프리 운동을 선택해주세요");
      return;
    }

    const lastSet = sets[sets.length - 1];
    if (!lastSet.reps) {
      alert("마지막 세트의 횟수를 입력해주세요");
      return;
    }

    setIsSubmitting(true);

    try {
      // 커스텀 제출 핸들러가 있으면 사용
      if (onSubmit) {
        await onSubmit({
          title: selectedExercise.title,
          description,
          freeExerciseId: selectedExercise.id,
          sets: sets.map((set, index) => ({
            set: index + 1,
            reps: parseInt(set.reps),
            equipmentIds: set.selectedEquipments.map((eq) => eq.id),
          })),
          imageFiles,
          videoFiles,
          existingImageIds: existingImages.filter(img => !onRemoveExistingImage || existingImages.find(e => e.id === img.id)).map(img => img.id),
          existingVideoIds: existingVideos.filter(vid => !onRemoveExistingVideo || existingVideos.find(e => e.id === vid.id)).map(vid => vid.id),
        });
      } else if (mode === "create") {
        // 생성 모드: 기존 로직 사용
        const ptRecordItemResponse = await fetch(`/api/trainer/pt-records/${ptRecordId}/items`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: selectedExercise.title,
            description,
            type: "FREE",
          }),
        });

        if (!ptRecordItemResponse.ok) {
          throw new Error("PT Record Item 생성 실패");
        }

        const ptRecordItem = await ptRecordItemResponse.json();

        // 각 세트별로 FreeSetRecord 생성
        for (let i = 0; i < sets.length; i++) {
          const set = sets[i];
          const equipmentIds = set.selectedEquipments.map((eq) => eq.id);

          const freeSetRecordResponse = await fetch(
            `/api/trainer/free-set-records`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                ptRecordItemId: ptRecordItem.id,
                freeExerciseId: selectedExercise.id,
                reps: parseInt(set.reps),
                set: i + 1,
                equipmentIds,
              }),
            }
          );

          if (!freeSetRecordResponse.ok) {
            throw new Error(`${i + 1}번째 세트 기록 생성 실패`);
          }
        }

        // 미디어 업로드 처리
        if (imageFiles.length > 0 || videoFiles.length > 0) {
          setIsUploadingMedia(true);
          try {
            const uploadResults = await uploadMediaFiles(
              ptRecordId,
              ptRecordItem.id,
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
        // 수정 모드: API 호출 로직 추가 필요
        throw new Error("수정 모드는 onSubmit 핸들러가 필요합니다");
      }

      // 성공 후 초기화 (생성 모드에서만)
      if (mode === "create") {
        setSelectedExercise(null);
        setDescription("");
        setSets([{ id: `set-${Date.now()}-0`, reps: "", selectedEquipments: [] }]);
      }
      onComplete();
    } catch (error) {
      console.error("프리웨이트 기록 처리 실패:", error);
      const errorMessage = error instanceof Error ? error.message : "기록 처리 중 오류가 발생했습니다.";
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border relative">
      {/* 업로드 중 오버레이 */}
      {isUploadingMedia && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-700">미디어 업로드 중...</p>
          </div>
        </div>
      )}
      
      <h3 className="text-lg font-semibold mb-4">
        프리웨이트 {mode === "edit" ? "수정" : "기록"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 운동 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            프리 운동 선택
          </label>
          {selectedExercise ? (
            <div className="flex items-center justify-between p-3 border border-gray-300 rounded-md bg-gray-50">
              <div>
                <p className="font-medium">{selectedExercise.title}</p>
                {selectedExercise.description && (
                  <p className="text-sm text-gray-600">{selectedExercise.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowExerciseModal(true)}
                className="text-blue-500 hover:text-blue-700 text-sm"
              >
                변경
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowExerciseModal(true)}
              className="w-full p-3 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-800"
            >
              + 운동 선택하기
            </button>
          )}
        </div>

        {/* 설명 입력 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            설명 (선택사항)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="운동에 대한 추가 설명이나 주의사항"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
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

        {/* 세트 입력 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            세트 기록
          </label>
          {sets.map((set, index) => (
            <div
              key={set.id}
              className="mb-4 p-4 border border-gray-200 rounded-md"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{index + 1}세트</span>
                {sets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSet(set.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    삭제
                  </button>
                )}
              </div>

              {/* 횟수 입력 */}
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">횟수</label>
                <input
                  type="number"
                  value={set.reps}
                  onChange={(e) => updateSetReps(set.id, e.target.value)}
                  onBlur={(e) => updateSetReps(set.id, e.target.value)} // Ensure value is captured on blur
                  onFocus={(e) => 
                    e.target.addEventListener("wheel", function (e) { 
                      e.preventDefault() 
                    }, { passive: false })
                  }
                  placeholder="횟수"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  min="1"
                  required
                />
              </div>

              {/* 선택된 기구들 */}
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">
                  선택된 기구
                </label>
                <div className="flex flex-wrap gap-2">
                  {set.selectedEquipments.map((equipment) => (
                    <span
                      key={equipment.id}
                      className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {getEquipmentDisplayText(equipment)}
                      <button
                        type="button"
                        onClick={() =>
                          removeEquipmentFromSet(set.id, equipment.id)
                        }
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* 기구 추가 */}
              <div>
                <button
                  type="button"
                  onClick={() => setSelectedSetId(set.id)}
                  className="text-blue-500 hover:text-blue-700 text-sm"
                >
                  + 기구 추가
                </button>
              </div>
            </div>
          ))}

          {/* 세트 추가 버튼 */}
          <button
            type="button"
            onClick={addSet}
            className="w-full p-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-800"
          >
            + 세트 추가
          </button>
        </div>

        {/* 제출 버튼 */}
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onComplete}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isUploadingMedia}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {(isSubmitting || isUploadingMedia) && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            {isUploadingMedia ? "미디어 업로드 중..." : isSubmitting ? "저장 중..." : mode === "edit" ? "수정 완료" : "기록 완료"}
          </button>
        </div>
      </form>

      {/* 운동 선택 모달 */}
      {showExerciseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
            <h4 className="text-lg font-semibold mb-4">프리 운동 선택</h4>

            <input
              type="text"
              value={exerciseQuery}
              onChange={(e) => setExerciseQuery(e.target.value)}
              placeholder="운동명 검색"
              className="w-full p-2 border border-gray-300 rounded-md mb-4"
              autoFocus
            />

            {exercisesLoading ? (
              <div className="text-center py-4">운동 목록을 불러오는 중...</div>
            ) : exercisesError ? (
              <div className="text-center py-4 text-red-500">
                운동 목록을 불러오는데 실패했습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {searchedExercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() => selectExercise(exercise)}
                    className="w-full p-3 text-left border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    <div className="font-medium">{exercise.title}</div>
                    {exercise.description && (
                      <div className="text-sm text-gray-600">{exercise.description}</div>
                    )}
                  </button>
                ))}
                
                {/* 검색 결과가 없고 검색어가 있을 때 새 운동 추가 버튼 표시 */}
                {searchedExercises.length === 0 && exerciseQuery.trim() && (
                  <button
                    onClick={() => createNewExercise(exerciseQuery.trim())}
                    disabled={isCreatingExercise}
                    className="w-full p-3 border-2 border-dashed border-blue-300 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="text-blue-600 font-medium">
                      {isCreatingExercise ? "추가 중..." : `"${exerciseQuery}" 운동 추가하기`}
                    </div>
                    <div className="text-sm text-gray-600">
                      클릭하여 새로운 운동을 추가합니다
                    </div>
                  </button>
                )}
                
                {/* 검색 결과가 없고 검색어도 없을 때 안내 메시지 */}
                {searchedExercises.length === 0 && !exerciseQuery.trim() && freeExercises && freeExercises.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    등록된 운동이 없습니다. 운동명을 입력하여 추가해주세요.
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setShowExerciseModal(false);
                  setExerciseQuery("");
                }}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 기구 검색 모달 */}
      {selectedSetId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
            <h4 className="text-lg font-semibold mb-4">기구 선택</h4>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="기구명 검색"
              className="w-full p-2 border border-gray-300 rounded-md mb-4"
              autoFocus
            />

            <div className="space-y-2">
              {searchedEquipments.map((equipment) => (
                <button
                  key={equipment.id}
                  onClick={() => addEquipmentToSet(selectedSetId, equipment)}
                  className="w-full p-2 text-left border border-gray-200 rounded-md hover:bg-gray-50"
                >
                  <div className="font-medium">{equipment.title}</div>
                  <div className="text-sm text-gray-600">
                    {equipment.primaryValue && equipment.primaryUnit && (
                      <span>
                        {equipment.primaryValue}
                        {equipment.primaryUnit}
                      </span>
                    )}
                    {equipment.description && (
                      <span className="ml-2">- {equipment.description}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setSelectedSetId(null);
                  setQuery("");
                }}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default FreeRecord;
