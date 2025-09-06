// app/trainer/lesson/[id]/EditRecordModal.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
} from "@/app/components/ui/Modal";
import { Button } from "@/app/components/ui/Button";
import useSWRMutation from "swr/mutation";
import type { RecordedExerciseState } from "./record/page";

interface EditRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: RecordedExerciseState | null;
  lessonId: string;
  onSuccess?: (updatedRecord?: RecordedExerciseState) => void;
}

// PUT 요청을 위한 fetcher
const updateRecordFetcher = async (url: string, { arg }: { arg: any }) => {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!response.ok) {
    throw new Error("수정에 실패했습니다.");
  }

  return response.json();
};

// DELETE 요청을 위한 fetcher
const deleteRecordFetcher = async (url: string) => {
  const response = await fetch(url, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("삭제에 실패했습니다.");
  }

  return response.json();
};

export default function EditRecordModal({
  isOpen,
  onClose,
  record,
  lessonId,
  onSuccess,
}: EditRecordModalProps) {
  const [formData, setFormData] = useState<RecordedExerciseState | null>(null);

  // 모달이 열릴 때 초기 데이터 설정
  useEffect(() => {
    if (isOpen && record) {
      setFormData({ ...record });
    } else {
      setFormData(null);
    }
  }, [isOpen, record]);

  // SWR Mutation으로 PUT 요청 관리 - 올바른 API 경로 사용
  const { trigger: updateRecord, isMutating } = useSWRMutation(
    record?.dbId ? `/api/trainer/lesson/${lessonId}/records/${record.dbId}` : null,
    updateRecordFetcher
  );

  // SWR Mutation으로 DELETE 요청 관리
  const { trigger: deleteRecord, isMutating: isDeleting } = useSWRMutation(
    record?.dbId ? `/api/trainer/lesson/${lessonId}/records/${record.dbId}` : null,
    deleteRecordFetcher
  );

  const handleSave = async () => {
    if (!record || !formData) return;

    try {
      // 세트 데이터 추출 (reps만 전송)
      const sets = formData.details?.sets?.map(set => ({ reps: set.reps })) || [];
      
      const result = await updateRecord({ sets });
      
      if (result?.success) {
        // 업데이트된 데이터로 상태 업데이트
        const updatedRecord = {
          ...formData,
          details: {
            ...formData.details,
            sets: formData.details?.sets?.map((set, index) => ({
              ...set,
              reps: sets[index]?.reps || set.reps
            })) || []
          }
        };
        onSuccess?.(updatedRecord);
        onClose();
      }
    } catch (error) {
      console.error("운동 기록 수정 실패:", error);
      alert("수정에 실패했습니다.");
    }
  };

  const handleDelete = async () => {
    if (!record) return;

    if (window.confirm(`"${record.title}" 운동 기록을 삭제하시겠습니까?`)) {
      try {
        await deleteRecord();
        onSuccess?.(); // 삭제 시에는 updatedRecord 없이 호출
        onClose();
      } catch (error) {
        console.error("운동 기록 삭제 실패:", error);
        alert("삭제에 실패했습니다.");
      }
    }
  };

  if (!record) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        운동 기록 수정 - {record.title}
      </ModalHeader>

      <ModalContent className="p-6">
        {/* 운동 타입별 상세보기 및 수정 */}
        {record.type === "MACHINE" && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">머신 운돐 상세</h4>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">머신:</span> {record.title}</div>
                <div><span className="font-medium">세트 수:</span> {record.details.sets?.length || 0}세트</div>
              </div>
            </div>
            
            {/* 세트별 상세 정보 */}
            <div className="space-y-3">
              <h5 className="font-medium text-gray-900">세트 정보</h5>
              {record.details.sets?.map((set, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">세트 {index + 1}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">횟수:</span>
                      <input
                        type="number"
                        value={formData?.details?.sets?.[index]?.reps ?? set.reps}
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center"
                        onChange={(e) => {
                          if (formData) {
                            const newSets = [...(formData.details?.sets || [])];
                            newSets[index] = { ...newSets[index], reps: parseInt(e.target.value) || 0 };
                            setFormData({
                              ...formData,
                              details: { ...formData.details, sets: newSets }
                            });
                          }
                        }}
                      />
                      <span className="text-sm text-gray-600">회</span>
                    </div>
                  </div>
                  {/* 설정값 표시 (읽기전용) */}
                  <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    {set.settings?.map((setting, idx) => (
                      <span key={idx} className="mr-3">
                        {setting.settingName}: {setting.value}{setting.unit}
                      </span>
                    )) || '설정 없음'}
                  </div>
                </div>
              )) || (
                <div className="text-center text-gray-500 py-4">
                  세트 데이터가 없습니다.
                </div>
              )}
            </div>
          </div>
        )}

        {record.type === "FREE" && (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">프리웨이트 운돐 상세</h4>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">운동명:</span> {record.title}</div>
                <div><span className="font-medium">세트 수:</span> {record.details.sets?.length || 0}세트</div>
                {record.details.equipmentNames && record.details.equipmentNames.length > 0 && (
                  <div><span className="font-medium">사용 장비:</span> {record.details.equipmentNames.join(", ")}</div>
                )}
              </div>
            </div>
            
            {/* 세트별 상세 정보 */}
            <div className="space-y-3">
              <h5 className="font-medium text-gray-900">세트 정보</h5>
              {record.details.sets?.map((set, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">세트 {index + 1}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">횟수:</span>
                      <input
                        type="number"
                        value={formData?.details?.sets?.[index]?.reps ?? set.reps}
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-center"
                        onChange={(e) => {
                          if (formData) {
                            const newSets = [...(formData.details?.sets || [])];
                            newSets[index] = { ...newSets[index], reps: parseInt(e.target.value) || 0 };
                            setFormData({
                              ...formData,
                              details: { ...formData.details, sets: newSets }
                            });
                          }
                        }}
                      />
                      <span className="text-sm text-gray-600">회</span>
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center text-gray-500 py-4">
                  세트 데이터가 없습니다.
                </div>
              )}
            </div>
          </div>
        )}

        {record.type === "STRETCHING" && (
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">스트레칭 운돐 상세</h4>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">운동명:</span> {record.title}</div>
                {record.details.duration && (
                  <div><span className="font-medium">시간/반복:</span> {record.details.duration}</div>
                )}
                {record.details.equipmentNames && record.details.equipmentNames.length > 0 && (
                  <div><span className="font-medium">사용 장비:</span> {record.details.equipmentNames.join(", ")}</div>
                )}
                {record.details.stretchingDescription && (
                  <div><span className="font-medium">설명:</span> {record.details.stretchingDescription}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 공통 메모 필드 */}
        {record.details.description && (
          <div className="mt-4">
            <h5 className="font-medium text-gray-900 mb-2">메모</h5>
            <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded">
              {record.details.description}
            </div>
          </div>
        )}
      </ModalContent>

      <ModalFooter>
        <div className="flex justify-between w-full">
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={isMutating || isDeleting}
          >
            삭제
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isMutating || isDeleting}
            >
              닫기
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isMutating || isDeleting}
            >
              세트 수 저장
            </Button>
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
}
