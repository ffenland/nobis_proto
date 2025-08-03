"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createMachine, IMachineDetail, IMachineSetting } from "./actions";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { toast } from "react-hot-toast";
import { ArrowLeft, Plus, Edit2, X, Camera } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export enum IMachineValueEditState {
  NEW = "NEW",
  EDIT = "EDIT",
  HOLD = "HOLD",
  ADDING = "ADDING",
}

interface MachineFormProps {
  centerId: string;
}

export default function MachineForm({ centerId }: MachineFormProps) {
  const router = useRouter();
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 사진 관련 상태
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 새로 추가된 input에 포커스
  useEffect(() => {
    if (lastAddedValueId && inputRef.current) {
      inputRef.current.focus();
      setLastAddedValueId(null);
    }
  }, [lastAddedValueId]);

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
      // 파일 크기 검증 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}은(는) 10MB를 초과합니다.`);
        return false;
      }
      // 파일 타입 검증
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name}은(는) 이미지 파일이 아닙니다.`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      // 기존 미리보기 URL 정리
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));

      // 새로운 이미지 설정
      setSelectedImages((prev) => [...prev, ...validFiles]);

      // 새로운 미리보기 생성
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

  // 머신 설정 삭제
  const removeSetting = (settingId: string) => {
    setMachine((prev) => ({
      ...prev,
      machineSetting: prev.machineSetting.filter((s) => s.id !== settingId),
    }));
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
      toast.error("세팅 이름을 입력해주세요.");
      return;
    }

    // 기존 세팅 수정
    if (machine.machineSetting.find((s) => s.id === updatedSetting.id)) {
      setMachine({
        ...machine,
        machineSetting: machine.machineSetting.map((s) =>
          s.id === updatedSetting.id
            ? {
                ...updatedSetting,
                values: updatedSetting.values.filter(
                  (v) => v.value.trim() !== ""
                ),
              }
            : s
        ),
      });
    } else {
      // 새 세팅 추가
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
    }

    setSelectedSetting(null);
    setShowAddSettingModal(false);
  };

  // 이미지 업로드 함수
  const uploadMachineImages = async (machineId: string) => {
    const uploadedImageIds: string[] = [];

    for (const imageFile of selectedImages) {
      try {
        // 1. 업로드 URL 가져오기
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

        // 2. Cloudflare에 이미지 업로드
        const formData = new FormData();
        formData.append("file", imageFile);

        const uploadResponse = await fetch(uploadURL, {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("이미지 업로드 실패");
        }

        uploadedImageIds.push(customId);
      } catch (error) {
        console.error("이미지 업로드 실패:", error);
        toast.error(`${imageFile.name} 업로드 실패`);
      }
    }

    return uploadedImageIds;
  };

  const handleSave = async () => {
    if (!machine.title.trim()) {
      toast.error("머신 이름을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createMachine(centerId, machine);
      if (result.ok && result.data?.machineId) {
        // 머신 생성 성공 후 이미지 업로드
        if (selectedImages.length > 0) {
          toast.loading("이미지 업로드 중...");
          await uploadMachineImages(result.data.machineId);
        }

        toast.success("머신이 등록되었습니다.");
        router.push(
          `/manager/centers/${centerId}/machines/${result.data.machineId}`
        );
      } else {
        toast.error(
          result.error?.message || "머신 생성 중 오류가 발생했습니다."
        );
      }
    } catch (error) {
      console.log(error);
      toast.error("머신 생성 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">기본 정보</h2>
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
                placeholder="예: 레그프레스 머신"
              />
            </div>

            {/* 사진 첨부 섹션 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                머신 사진
              </label>

              {/* 이미지 미리보기 */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square">
                      <Image
                        src={preview}
                        alt={`머신 사진 ${index + 1}`}
                        fill
                        className="object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 사진 추가 버튼 */}
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
            <h2 className="text-lg font-semibold">머신 설정</h2>
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
                        onClick={() => {
                          setSelectedSetting(setting);
                          setShowAddSettingModal(true);
                        }}
                        className="p-1 text-gray-600 hover:text-gray-800"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeSetting(setting.id)}
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

      {/* 버튼 영역 */}
      <div className="flex justify-between">
        <Link href={`/manager/centers/${centerId}/machines`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            취소
          </Button>
        </Link>
        <Button variant="primary" onClick={handleSave} disabled={isSubmitting}>
          {isSubmitting ? "저장 중..." : "머신 등록"}
        </Button>
      </div>

      {/* 세팅값 수정 모달 */}
      <dialog
        id="add-setting-modal"
        className={`modal ${showAddSettingModal ? "modal-open" : ""}`}
      >
        {selectedSetting && (
          <div className="modal-box w-11/12 max-w-2xl">
            <h3 className="font-bold text-lg mb-4">
              {selectedSetting.isNew ? "새 설정 추가" : "설정 수정"}
            </h3>

            {/* 세팅 이름 입력 */}
            <div className="mb-4">
              <label className="label">
                <span className="label-text">설정 이름</span>
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
                className="input input-bordered w-full"
                placeholder="예: 무게, 좌석 높이, 각도"
              />
            </div>

            {/* 단위 입력 */}
            <div className="mb-6">
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
                <Button size="sm" variant="outline" onClick={addSettingValue}>
                  <Plus className="w-4 h-4 mr-1" />값 추가
                </Button>
              </div>

              {selectedSetting.values.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
                  <p>설정 값을 추가해주세요.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
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
                        className={`flex items-center border-2 rounded-lg ${
                          value.editState === IMachineValueEditState.ADDING
                            ? "border-blue-500"
                            : "border-gray-300"
                        }`}
                      >
                        <input
                          ref={value.id === lastAddedValueId ? inputRef : null}
                          type="text"
                          value={value.value}
                          onChange={(e) =>
                            onSettingValueChange({
                              id: value.id,
                              value: e.target.value,
                            })
                          }
                          className="flex-1 px-2 py-1 border-0 focus:outline-none"
                          placeholder="값 입력"
                        />
                        <button
                          onClick={() => removeSettingValue(value.id)}
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
                  setSelectedSetting(null);
                  setShowAddSettingModal(false);
                }}
              >
                취소
              </Button>
              <Button variant="primary" onClick={saveSettingValues}>
                저장
              </Button>
            </div>
          </div>
        )}
        <div
          className="modal-backdrop"
          onClick={() => {
            setSelectedSetting(null);
            setShowAddSettingModal(false);
          }}
        />
      </dialog>
    </div>
  );
}
