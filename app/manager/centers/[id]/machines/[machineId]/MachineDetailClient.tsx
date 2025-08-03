"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { toast } from "react-hot-toast";
import { Edit2, X, Plus, Camera } from "lucide-react";
import { getOptimizedImageUrl } from "@/app/lib/utils/media.utils";
import FullscreenImageViewer from "@/app/components/media/FullscreenImageViewer";
import type { MachineDetail } from "@/app/lib/services/machine.service";
import Image from "next/image";

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

interface MachineDetailData {
  id: string;
  title: string;
  fitnessCenter: {
    id: string;
    title: string;
  } | null;
  machineSetting: MachineSetting[];
  images?: {
    id: string;
    cloudflareId: string;
    originalName: string;
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

interface MachineDetailClientProps {
  machineId: string;
  centerId: string;
  initialData: MachineDetail;
}

// SWR fetcher
const fetcher = async (url: string): Promise<MachineDetailData> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

export default function MachineDetailClient({
  machineId,
  centerId,
  initialData,
}: MachineDetailClientProps) {
  const router = useRouter();

  // SWR로 데이터 관리
  const { data: originalMachine, mutate } = useSWR<MachineDetailData>(
    `/api/manager/machines/${machineId}`,
    fetcher,
    {
      fallbackData: initialData as MachineDetailData,
      revalidateOnFocus: false,
    }
  );

  // 로컬 상태
  const [machine, setMachine] = useState<MachineDetailData | null>(
    originalMachine || null
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSettingModal, setShowSettingModal] = useState(false);
  const [editingSetting, setEditingSetting] = useState<MachineSetting | null>(
    null
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 이미지 관련 상태
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  // 원본 데이터가 변경되면 로컬 상태 업데이트
  useEffect(() => {
    if (originalMachine) {
      setMachine(originalMachine);
    }
  }, [originalMachine]);

  // 이미지 미리보기 정리
  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  // 이미지 파일 처리
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    const validFiles = files.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}은(는) 10MB를 초과합니다.`);
        return false;
      }
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name}은(는) 이미지 파일이 아닙니다.`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));

      setSelectedImages((prev) => [...prev, ...validFiles]);

      const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  // 이미지 제거
  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // 기존 이미지 삭제
  const deleteExistingImage = async (imageId: string) => {
    if (!confirm("이 이미지를 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/media/images/${imageId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("이미지 삭제 실패");
      }

      toast.success("이미지가 삭제되었습니다.");
      await mutate();
    } catch (error) {
      console.log(error);
      toast.error("이미지 삭제 중 오류가 발생했습니다.");
    }
  };

  // 이미지 업로드
  const uploadMachineImages = async () => {
    const uploadedImageIds: string[] = [];

    for (const imageFile of selectedImages) {
      try {
        const uploadUrlResponse = await fetch(`/api/media/images/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType: "machine",
            entityId: machineId,
          }),
        });

        if (!uploadUrlResponse.ok) {
          throw new Error("이미지 업로드 URL 생성 실패");
        }

        const { uploadURL, customId } = await uploadUrlResponse.json();

        const formData = new FormData();
        formData.append("file", imageFile);

        const uploadResponse = await fetch(uploadURL, {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("이미지 업로드 실패");
        }

        // DB에 이미지 정보 저장
        const confirmResponse = await fetch("/api/media/images/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cloudflareId: customId,
            originalName: imageFile.name,
            mimeType: imageFile.type,
            size: imageFile.size,
            type: "MACHINE",
            entityId: machineId,
          }),
        });

        if (!confirmResponse.ok) {
          throw new Error("이미지 정보 DB 저장 실패");
        }

        uploadedImageIds.push(customId);
      } catch (error) {
        console.error("이미지 업로드 실패:", error);
        toast.error(`${imageFile.name} 업로드 실패`);
      }
    }

    return uploadedImageIds;
  };

  // 새 설정 추가
  const handleAddSetting = () => {
    const newSetting: MachineSetting = {
      id: `temp-${Date.now()}`,
      title: "",
      unit: "",
      values: [],
      isNew: true,
    };
    setEditingSetting(newSetting);
    setShowSettingModal(true);
  };

  // 기존 설정 수정
  const handleEditSetting = (setting: MachineSetting) => {
    setEditingSetting({
      ...setting,
      values: setting.values.map((v) => ({ ...v })),
    });
    setShowSettingModal(true);
  };

  // 설정에 값 추가
  const addValueToSetting = () => {
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
  };

  // 설정 값 수정
  const updateSettingValue = (valueId: string, newValue: string) => {
    if (!editingSetting) return;

    setEditingSetting({
      ...editingSetting,
      values: editingSetting.values.map((v) =>
        v.id === valueId ? { ...v, value: newValue } : v
      ),
    });
  };

  // 설정 값 삭제
  const removeValueFromSetting = (valueId: string) => {
    if (!editingSetting) return;

    setEditingSetting({
      ...editingSetting,
      values: editingSetting.values.filter((v) => v.id !== valueId),
    });
  };

  // 설정 저장
  const saveSetting = () => {
    if (!editingSetting || !machine) return;

    if (!editingSetting.title.trim()) {
      toast.error("설정 이름을 입력해주세요.");
      return;
    }

    if (!editingSetting.unit.trim()) {
      toast.error("단위를 입력해주세요.");
      return;
    }

    const validValues = editingSetting.values.filter(
      (v) => v.value.trim() !== ""
    );

    if (validValues.length === 0) {
      toast.error("최소 하나의 값을 입력해주세요.");
      return;
    }

    const updatedSetting = {
      ...editingSetting,
      values: validValues,
    };

    if (editingSetting.isNew) {
      setMachine({
        ...machine,
        machineSetting: [...machine.machineSetting, updatedSetting],
      });
    } else {
      setMachine({
        ...machine,
        machineSetting: machine.machineSetting.map((s) =>
          s.id === updatedSetting.id ? updatedSetting : s
        ),
      });
    }

    setEditingSetting(null);
    setShowSettingModal(false);
  };

  // 설정 삭제
  const deleteSetting = (settingId: string) => {
    if (!machine) return;

    if (confirm("이 설정을 삭제하시겠습니까?")) {
      setMachine({
        ...machine,
        machineSetting: machine.machineSetting.filter(
          (s) => s.id !== settingId
        ),
      });
    }
  };

  // 변경사항 확인
  const hasChanges = useMemo(() => {
    if (!originalMachine || !machine) return false;

    if (originalMachine.title !== machine.title) return true;

    if (originalMachine.machineSetting.length !== machine.machineSetting.length)
      return true;

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
  const saveMachine = async () => {
    if (!machine || (!hasChanges && selectedImages.length === 0)) {
      toast.error("변경된 내용이 없습니다.");
      return;
    }

    setIsUpdating(true);

    try {
      // 변경사항이 있으면 머신 정보 업데이트
      if (hasChanges) {
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

        if (!result.success) {
          throw new Error(result.error || "저장에 실패했습니다.");
        }
      }

      // 이미지 업로드
      if (selectedImages.length > 0) {
        toast.loading("이미지 업로드 중...");
        await uploadMachineImages();
      }

      toast.success("머신이 성공적으로 수정되었습니다.");
      await mutate();

      // 이미지 상태 초기화
      setSelectedImages([]);
      setImagePreviews((prevPreviews) => {
        prevPreviews.forEach((url) => URL.revokeObjectURL(url));
        return [];
      });

      // 머신 목록 페이지로 이동
      router.push(`/manager/centers/${centerId}/machines`);
    } catch (error) {
      console.error("Update error:", error);
      toast.error(
        error instanceof Error ? error.message : "저장 중 오류가 발생했습니다."
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // 머신 삭제
  const deleteMachine = async () => {
    if (!machine) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/manager/machines/${machineId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("머신이 성공적으로 삭제되었습니다.");
        router.push(`/manager/centers/${centerId}/machines`);
      } else {
        toast.error(result.error || "삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (!machine) return null;

  return (
    <div className="space-y-4">
      {/* 머신 이미지 */}
      {(machine.images && machine.images.length > 0) ||
      imagePreviews.length > 0 ? (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">머신 이미지</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {/* 기존 이미지 */}
              {machine.images?.map((image) => (
                <div key={image.id} className="relative aspect-square group">
                  <Image
                    fill
                    src={getOptimizedImageUrl(image.cloudflareId, "avatarSM")}
                    alt={image.originalName}
                    className="w-full h-full object-cover rounded-lg cursor-pointer"
                    onClick={() => setSelectedImageId(image.cloudflareId)}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteExistingImage(image.id);
                    }}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {/* 새로 추가할 이미지 미리보기 */}
              {imagePreviews.map((preview, index) => (
                <div
                  key={`preview-${index}`}
                  className="relative aspect-square"
                >
                  <Image
                    fill
                    src={preview}
                    alt={`새 이미지 ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-1 left-1 px-2 py-1 bg-blue-500 text-white text-xs rounded">
                    새 이미지
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">기본 정보</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                머신 이름
              </label>
              <input
                type="text"
                value={machine.title}
                onChange={(e) =>
                  setMachine({ ...machine, title: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="머신 이름을 입력하세요"
              />
            </div>

            {/* 사진 추가 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                사진 추가
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Camera className="w-5 h-5" />
                <span>사진 추가</span>
              </button>
              <p className="text-xs text-gray-500 mt-1">
                최대 10MB, JPG/PNG 형식 지원
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 머신 설정 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">머신 설정</h3>
            <Button variant="outline" size="sm" onClick={handleAddSetting}>
              <Plus className="w-4 h-4 mr-1" />
              설정 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {machine.machineSetting.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">머신 설정이 없습니다.</p>
              <p className="text-sm">예: 무게, 좌석 높이, 각도 등</p>
            </div>
          ) : (
            <div className="space-y-3">
              {machine.machineSetting.map((setting) => (
                <div
                  key={setting.id}
                  className="border border-gray-200 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{setting.title}</h4>
                      <p className="text-sm text-gray-600">
                        단위: {setting.unit}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditSetting(setting)}
                        className="p-1 text-gray-600 hover:text-gray-800"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteSetting(setting.id)}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {setting.values.map((value) => (
                      <span
                        key={value.id}
                        className="px-2 py-1 bg-gray-100 rounded text-sm"
                      >
                        {value.value}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 액션 버튼 */}
      <div className="flex justify-between">
        <Button
          variant="danger"
          onClick={() => setShowDeleteModal(true)}
          disabled={isDeleting}
        >
          {isDeleting ? "삭제 중..." : "머신 삭제"}
        </Button>

        <Button
          variant="primary"
          onClick={saveMachine}
          disabled={isUpdating || (!hasChanges && selectedImages.length === 0)}
        >
          {isUpdating ? "저장 중..." : "변경사항 저장"}
        </Button>
      </div>

      {/* 설정 수정 모달 */}
      {showSettingModal && editingSetting && (
        <dialog className="modal modal-open">
          <div className="modal-box w-11/12 max-w-2xl">
            <h3 className="font-bold text-lg mb-4">
              {editingSetting.isNew ? "새 설정 추가" : "설정 수정"}
            </h3>

            {/* 설정 이름 */}
            <div className="mb-4">
              <label className="label">
                <span className="label-text">설정 이름</span>
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
                className="input input-bordered w-full"
                placeholder="예: 무게, 좌석 높이, 각도"
              />
            </div>

            {/* 단위 */}
            <div className="mb-6">
              <label className="label">
                <span className="label-text">단위</span>
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
                className="input input-bordered w-full"
                placeholder="예: kg, cm, 도"
              />
            </div>

            {/* 설정 값 목록 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="label">
                  <span className="label-text">설정 값</span>
                </label>
                <Button size="sm" variant="outline" onClick={addValueToSetting}>
                  <Plus className="w-4 h-4 mr-1" />값 추가
                </Button>
              </div>

              {editingSetting.values.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                  <p>설정 값을 추가해주세요.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                  {editingSetting.values.map((value, index) => (
                    <div
                      key={value.id}
                      className="flex items-center border rounded-lg"
                    >
                      <input
                        type="text"
                        value={value.value}
                        onChange={(e) =>
                          updateSettingValue(value.id, e.target.value)
                        }
                        className="flex-1 px-2 py-1 border-0 focus:outline-none"
                        placeholder={`값 ${index + 1}`}
                      />
                      <button
                        onClick={() => removeValueFromSetting(value.id)}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-action">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingSetting(null);
                  setShowSettingModal(false);
                }}
              >
                취소
              </Button>
              <Button variant="primary" onClick={saveSetting}>
                저장
              </Button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => {
              setEditingSetting(null);
              setShowSettingModal(false);
            }}
          />
        </dialog>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">머신 삭제 확인</h3>
            <p className="mb-6">
              정말로 이 머신을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="modal-action">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                취소
              </Button>
              <Button
                variant="danger"
                onClick={deleteMachine}
                disabled={isDeleting}
              >
                {isDeleting ? "삭제 중..." : "삭제"}
              </Button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => !isDeleting && setShowDeleteModal(false)}
          />
        </dialog>
      )}

      {/* 풀스크린 이미지 뷰어 */}
      <FullscreenImageViewer
        imageId={selectedImageId || ""}
        isOpen={!!selectedImageId}
        onClose={() => setSelectedImageId(null)}
      />
    </div>
  );
}
