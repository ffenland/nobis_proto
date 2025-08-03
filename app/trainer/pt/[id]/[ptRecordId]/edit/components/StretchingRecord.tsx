"use client";

import { useState, useEffect } from "react";
import {
  IEquipment,
  IStretchingExercise,
} from "@/app/lib/services/trainer/pt-record.service";
import { matchSearch } from "@/app/components/common/matchSearch";
import useSWR from "swr";
import type { StretchingRecordSubmitData } from "./types";
import ExerciseImageUpload from "@/app/components/media/ExerciseImageUpload";
import ExerciseVideoUpload from "@/app/components/media/ExerciseVideoUpload";
import { uploadMediaFiles } from "./uploadMedia";

interface StretchingRecordProps {
  ptRecordId: string;
  onComplete: () => void;
  equipmentList: IEquipment[];
  mode?: "create" | "edit";
  ptRecordItemId?: string;
  nextEntry?: number;
  initialData?: {
    stretchingExerciseId?: string;
    description?: string;
    equipments?: IEquipment[];
  };
  onSubmit?: (data: StretchingRecordSubmitData) => Promise<void>;
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


// API fetcher 함수
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error("Failed to fetch");
    }
    return res.json();
  });

const StretchingRecord = ({
  ptRecordId,
  onComplete,
  equipmentList,
  mode = "create",
  initialData,
  nextEntry,
  onSubmit,
  existingImages = [],
  existingVideos = [],
  onRemoveExistingImage,
  onRemoveExistingVideo,
}: StretchingRecordProps) => {
  const [selectedExercise, setSelectedExercise] =
    useState<IStretchingExercise | null>(null);
  const [description, setDescription] = useState(initialData?.description || "");
  const [selectedEquipments, setSelectedEquipments] = useState<IEquipment[]>(
    initialData?.equipments || []
  );
  const [query, setQuery] = useState("");
  const [equipmentQuery, setEquipmentQuery] = useState("");
  const [searchedExercises, setSearchedExercises] = useState<
    IStretchingExercise[]
  >([]);
  const [searchedEquipments, setSearchedEquipments] = useState<IEquipment[]>(
    []
  );
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  
  // 미디어 파일 상태
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);

  // 스트레칭 운동 목록 조회
  const {
    data: stretchingExercises,
    error: exercisesError,
    isLoading: exercisesLoading,
  } = useSWR<IStretchingExercise[]>(
    `/api/trainer/stretching-exercises`,
    fetcher
  );

  // 초기 운동 설정 (수정 모드)
  useEffect(() => {
    if (mode === "edit" && initialData?.stretchingExerciseId && stretchingExercises) {
      const exercise = stretchingExercises.find(
        e => e.id === initialData.stretchingExerciseId
      );
      if (exercise) {
        setSelectedExercise(exercise);
      }
    }
  }, [mode, initialData, stretchingExercises]);

  // 운동 검색
  useEffect(() => {
    if (stretchingExercises) {
      const results = matchSearch<IStretchingExercise>(
        stretchingExercises,
        "title",
        query
      );
      setSearchedExercises(results);
    }
  }, [query, stretchingExercises]);

  // 기구 검색
  useEffect(() => {
    const results = matchSearch<IEquipment>(
      equipmentList,
      "title",
      equipmentQuery
    );
    setSearchedEquipments(results);
  }, [equipmentQuery, equipmentList]);

  // 운동 선택
  const selectExercise = (exercise: IStretchingExercise) => {
    setSelectedExercise(exercise);
    setQuery("");
    setShowExerciseModal(false);
  };

  // 기구 추가
  const addEquipment = (equipment: IEquipment) => {
    if (!selectedEquipments.find((eq) => eq.id === equipment.id)) {
      setSelectedEquipments([...selectedEquipments, equipment]);
    }
    setEquipmentQuery("");
    setShowEquipmentModal(false);
  };

  // 기구 삭제
  const removeEquipment = (equipmentId: string) => {
    setSelectedEquipments(
      selectedEquipments.filter((eq) => eq.id !== equipmentId)
    );
  };

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
      alert("스트레칭 운동을 선택해주세요");
      return;
    }

    setIsSubmitting(true);

    try {
      // 커스텀 제출 핸들러가 있으면 사용
      if (onSubmit) {
        await onSubmit({
          stretchingExerciseId: selectedExercise.id,
          description,
          equipmentIds: selectedEquipments.map((eq) => eq.id),
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
            type: "STRETCHING",
            entry: nextEntry,
          }),
        });

        if (!ptRecordItemResponse.ok) {
          throw new Error("PT Record Item 생성 실패");
        }

        const ptRecordItem = await ptRecordItemResponse.json();

        // StretchingExerciseRecord 생성
        const equipmentIds = selectedEquipments.map((eq) => eq.id);

        const stretchingRecordResponse = await fetch(
          `/api/trainer/stretching-records`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ptRecordItemId: ptRecordItem.id,
              stretchingExerciseId: selectedExercise.id,
              description,
              equipmentIds,
            }),
          }
        );

        if (!stretchingRecordResponse.ok) {
          throw new Error("스트레칭 기록 생성 실패");
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
        // 수정 모드: onSubmit 핸들러 필요
        throw new Error("수정 모드는 onSubmit 핸들러가 필요합니다");
      }

      // 성공 후 초기화 (생성 모드에서만)
      if (mode === "create") {
        setSelectedExercise(null);
        setDescription("");
        setSelectedEquipments([]);
      }
      onComplete();
    } catch (error) {
      console.error("스트레칭 기록 처리 실패:", error);
      const errorMessage = error instanceof Error ? error.message : "기록 처리 중 오류가 발생했습니다.";
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (exercisesLoading) {
    return (
      <div className="flex justify-center items-center min-h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (exercisesError) {
    return (
      <div className="text-center text-red-500">
        스트레칭 운동 목록을 불러오는 중 오류가 발생했습니다.
      </div>
    );
  }

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
        스트레칭 {mode === "edit" ? "수정" : "기록"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 스트레칭 운동 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            스트레칭 운동
          </label>
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              {selectedExercise ? (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="font-medium text-blue-900">
                    {selectedExercise.title}
                  </div>
                  <div className="text-sm text-blue-700">
                    {selectedExercise.description}
                  </div>
                </div>
              ) : (
                <div className="p-2 border border-gray-300 rounded-md text-gray-500">
                  스트레칭 운동을 선택해주세요
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowExerciseModal(true)}
              className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              선택
            </button>
          </div>
        </div>

        {/* 설명 입력 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            설명 및 주의사항
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="스트레칭 시 주의사항이나 특이사항을 기록해주세요"
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

        {/* 사용 기구 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            사용 기구 (선택사항)
          </label>
          <div className="mb-3">
            <div className="flex flex-wrap gap-2">
              {selectedEquipments.map((equipment) => (
                <span
                  key={equipment.id}
                  className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                >
                  {getEquipmentDisplayText(equipment)}
                  <button
                    type="button"
                    onClick={() => removeEquipment(equipment.id)}
                    className="ml-1 text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowEquipmentModal(true)}
            className="text-blue-500 hover:text-blue-700 text-sm"
          >
            + 기구 추가
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
            disabled={isSubmitting || isUploadingMedia || !selectedExercise}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {(isSubmitting || isUploadingMedia) && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            {isUploadingMedia ? "미디어 업로드 중..." : isSubmitting ? "저장 중..." : mode === "edit" ? "수정 완료" : "기록 완료"}
          </button>
        </div>
      </form>

      {/* 스트레칭 운동 선택 모달 */}
      {showExerciseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
            <h4 className="text-lg font-semibold mb-4">스트레칭 운동 선택</h4>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="운동명 검색"
              className="w-full p-2 border border-gray-300 rounded-md mb-4"
              autoFocus
            />

            <div className="space-y-2">
              {searchedExercises.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => selectExercise(exercise)}
                  className="w-full p-2 text-left border border-gray-200 rounded-md hover:bg-gray-50"
                >
                  <div className="font-medium">{exercise.title}</div>
                  <div className="text-sm text-gray-600">
                    {exercise.description}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setShowExerciseModal(false);
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

      {/* 기구 선택 모달 */}
      {showEquipmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
            <h4 className="text-lg font-semibold mb-4">기구 선택</h4>

            <input
              type="text"
              value={equipmentQuery}
              onChange={(e) => setEquipmentQuery(e.target.value)}
              placeholder="기구명 검색"
              className="w-full p-2 border border-gray-300 rounded-md mb-4"
              autoFocus
            />

            <div className="space-y-2">
              {searchedEquipments.map((equipment) => (
                <button
                  key={equipment.id}
                  onClick={() => addEquipment(equipment)}
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
                  setShowEquipmentModal(false);
                  setEquipmentQuery("");
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
export default StretchingRecord;
