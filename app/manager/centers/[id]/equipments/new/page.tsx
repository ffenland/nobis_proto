"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { X, Plus } from "lucide-react";
import Image from "next/image";
import AddGroupModal from "./AddGroupModal";
import AddBrandModal from "./AddBrandModal";

type Params = Promise<{ id: string }>;

// Fetcher functions
const fetcher = (url: string) => fetch(url).then((res) => res.json());

const createEquipmentFetcher = async (url: string, { arg }: { arg: any }) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create equipment");
  }

  return response.json();
};

export default function NewEquipmentPage({ params }: { params: Params }) {
  const router = useRouter();
  const [centerId, setCenterId] = useState<string>("");

  // Form state
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [primaryUnit, setPrimaryUnit] = useState("kg");
  const [secondaryValue, setSecondaryValue] = useState("");
  const [secondaryUnit, setSecondaryUnit] = useState("");
  const [description, setDescription] = useState("");
  const [model, setModel] = useState("");

  // Tag input state for primaryValues
  const [primaryValueInput, setPrimaryValueInput] = useState("");
  const [primaryValues, setPrimaryValues] = useState<string[]>([]);

  // 이미지 상태 - simplified system
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Modal state
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);

  // Get centerId from params
  useEffect(() => {
    params.then((p) => setCenterId(p.id));
  }, [params]);

  // Fetch groups and brands
  const { data: groups, mutate: mutateGroups } = useSWR("/api/equipments/group", fetcher);

  const { data: brands, mutate: mutateBrands } = useSWR("/api/equipments/brand", fetcher);

  // Create equipment mutation
  const { trigger: createEquipments } = useSWRMutation(
    centerId ? `/api/fitness-center/${centerId}/equipments` : null,
    createEquipmentFetcher
  );

  // Handle tag input
  const handleAddPrimaryValue = () => {
    const value = primaryValueInput.trim();
    if (value && !primaryValues.includes(value)) {
      setPrimaryValues([...primaryValues, value]);
      setPrimaryValueInput("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleAddPrimaryValue();
    }
  };

  const handleRemovePrimaryValue = (valueToRemove: string) => {
    setPrimaryValues(primaryValues.filter((v) => v !== valueToRemove));
  };

  // Handle adding image to selected files (preview only)
  const handleAddImage = (file: File) => {
    const currentCount = selectedFiles.length;

    if (currentCount >= 3) {
      alert("최대 3개까지만 이미지를 추가할 수 있습니다.");
      return;
    }

    // Add to selected files
    setSelectedFiles((prev: File[]) => [...prev, file]);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setFilePreviews((prev: string[]) => [...prev, previewUrl]);
  };

  // Remove selected image
  const handleRemoveImage = (index: number) => {
    // Revoke preview URL to free memory
    URL.revokeObjectURL(filePreviews[index]);

    setSelectedFiles((prev: File[]) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev: string[]) => prev.filter((_, i) => i !== index));
  };


  // Handle form submission - integrated equipment creation + image upload
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGroupId || primaryValues.length === 0) {
      alert("그룹과 최소 하나의 값을 입력해주세요.");
      return;
    }

    // if (selectedFiles.length === 0) {
    //   alert("장비 이미지를 선택해주세요.");
    //   return;
    // }

    const confirmCreate = window.confirm(
      `장비를 생성하시겠습니까?`
    );
    if (!confirmCreate) return;

    setIsUploading(true);

    try {
      // 1. Equipment 생성 단계 (이미지 없이)
      setUploadProgress(20);

      const equipmentData = {
        groupId: selectedGroupId,
        brandId: selectedBrandId || undefined,
        primaryValues,
        primaryUnit,
        secondaryValue: secondaryValue || undefined,
        secondaryUnit: secondaryUnit || undefined,
        description: description || undefined,
        model: model || undefined,
      };

      const equipmentResult = await createEquipments(equipmentData);

      setUploadProgress(100);

      // 2. 이미지 업로드 및 연결 단계 - 임시 주석 처리
      // for (let i = 0; i < selectedFiles.length; i++) {
      //   const file = selectedFiles[i];
      //   setUploadProgress(40 + ((i + 1) / selectedFiles.length) * 40); // 40%~80%

      //   // Upload URL 요청
      //   const uploadUrlResponse = await fetch("/api/media/images/upload", {
      //     method: "POST",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify({
      //       entityType: "EQUIPMENT",
      //       entityId: equipmentId, // 생성된 equipmentId 사용
      //     }),
      //   });
      //   if (!uploadUrlResponse.ok) {
      //     throw new Error("업로드 URL 생성에 실패했습니다.");
      //   }
      //   const { uploadURL, id } = await uploadUrlResponse.json();

      //   // Cloudflare 직접 업로드
      //   const formData = new FormData();
      //   formData.append("file", file);
      //   const uploadResponse = await fetch(uploadURL, {
      //     method: "POST",
      //     body: formData,
      //   });
      //   if (!uploadResponse.ok) {
      //     throw new Error("이미지 업로드에 실패했습니다.");
      //   }

      //   // 업로드 확인 및 DB 저장 (equipmentId와 연결)
      //   const confirmResponse = await fetch("/api/media/images/confirm", {
      //     method: "POST",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify({
      //       cloudflareId: id,
      //       entityType: "EQUIPMENT",
      //       entityId: equipmentId, // 생성된 equipmentId 사용
      //     }),
      //   });
      //   if (!confirmResponse.ok) {
      //     throw new Error("업로드 확인에 실패했습니다.");
      //   }

      //   // 이미지가 성공적으로 연결됨
      // }
      alert("장비가 성공적으로 생성되었습니다!");
      router.push(`/manager/centers/${centerId}/equipments`);
    } catch (error) {
      console.error("장비 생성 실패:", error);
      if (error instanceof Error) {
        alert(`장비 생성에 실패했습니다: ${error.message}`);
      } else {
        alert("장비 생성에 실패했습니다.");
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <>
      {/* Upload Progress Modal */}
      {isUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
              <h3 className="text-lg font-semibold mb-2">장비 생성 중</h3>
              <p className="text-gray-600 mb-4">
                {uploadProgress < 40
                  ? "장비를 생성하고 있습니다..."
                  : uploadProgress < 80
                  ? "이미지를 업로드하고 있습니다..."
                  : "마무리하고 있습니다..."
                }
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">{uploadProgress}%</p>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">새 장비 등록</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Equipment Group */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">장비 그룹 *</span>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => setIsGroupModalOpen(true)}
            >
              그룹 추가
            </button>
          </label>
          <select
            className="select select-bordered w-full"
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            required
          >
            <option value="">그룹을 선택하세요</option>
            {groups?.map((group: any) => (
              <option key={group.id} value={group.id}>
                {group.name}
                {group.description && ` - ${group.description}`}
              </option>
            ))}
          </select>
        </div>

        {/* Equipment Brand */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">브랜드</span>
            <button
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => setIsBrandModalOpen(true)}
            >
              브랜드 추가
            </button>
          </label>
          <select
            className="select select-bordered w-full"
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
          >
            <option value="">브랜드 선택 (선택사항)</option>
            {brands?.map((brand: any) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>

        {/* Primary Values - Tag Input */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">
              값 입력 (입력후 Enter 또는 Space를 누르면 추가됩니다.)
            </span>
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              className="input input-bordered flex-1"
              value={primaryValueInput}
              onChange={(e) => setPrimaryValueInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="값을 입력하고 Enter 또는 Space를 누르세요"
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAddPrimaryValue}
            >
              <Plus className="w-4 h-4" />
              추가
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {primaryValues.map((value) => (
              <div key={value} className="badge badge-lg gap-2">
                <span>{value}</span>
                <button
                  type="button"
                  onClick={() => handleRemovePrimaryValue(value)}
                  className="text-error"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Primary Unit */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">단위 *</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={primaryUnit}
            onChange={(e) => setPrimaryUnit(e.target.value)}
            placeholder="예: kg, lbs, 개"
            required
          />
        </div>

        {/* Secondary Value & Unit */}
        <div className="grid grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">부가 값</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={secondaryValue}
              onChange={(e) => setSecondaryValue(e.target.value)}
              placeholder="예: 30"
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">부가 단위</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={secondaryUnit}
              onChange={(e) => setSecondaryUnit(e.target.value)}
              placeholder="예: cm, inch"
            />
          </div>
        </div>

        {/* Model */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">모델명</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="모델명 (선택사항)"
          />
        </div>

        {/* Description */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">설명</span>
          </label>
          <textarea
            className="textarea textarea-bordered w-full"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="장비에 대한 설명 (선택사항)"
            rows={3}
          />
        </div>

        {/* 이미지 선택 - 임시 주석 처리 */}
        {/* <div className="form-control">
          <div className="flex items-center justify-between mb-2">
            <label className="label">
              <span className="label-text">
                이미지 ({selectedFiles.length}/3)
              </span>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Selected images (preview only) */}
            {/* {selectedFiles.map((_, index) => (
              <div key={`selected-${index}`} className="relative">
                <Image
                  src={filePreviews[index]}
                  alt="Selected image"
                  width={128}
                  height={128}
                  className="w-full h-32 object-cover rounded-lg border-2 border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  disabled={isUploading}
                  className="absolute top-2 right-2 btn btn-circle btn-xs btn-error"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-1 left-1 right-1">
                  <div className="bg-gray-500 bg-opacity-90 text-white text-xs px-2 py-1 rounded text-center">
                    선택됨
                  </div>
                </div>
              </div>
            ))} */}

            {/* Add new image button */}
            {/* {selectedFiles.length < 3 && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg h-32">
                <label className="cursor-pointer w-full h-full flex items-center justify-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      files.forEach((file) => handleAddImage(file));
                      // Reset input
                      e.target.value = "";
                    }}
                    disabled={isUploading}
                  />
                  <div className="text-center">
                    <Plus className="w-8 h-8 mx-auto text-gray-400" />
                    <span className="text-sm text-gray-500">이미지 추가</span>
                  </div>
                </label>
              </div>
            )} */}
          {/* </div>
        </div> */}

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            className="btn btn-primary flex-1"
            disabled={isUploading}
          >
            {isUploading ? (
              <span className="loading loading-spinner"></span>
            ) : (
              "장비 생성"
            )}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => router.back()}
            disabled={isUploading}
          >
            취소
          </button>
        </div>
      </form>

      {/* Modals */}
      <AddGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onSuccess={() => {
          mutateGroups(); // 그룹 목록 새로고침
        }}
      />
      
      <AddBrandModal
        isOpen={isBrandModalOpen}
        onClose={() => setIsBrandModalOpen(false)}
        onSuccess={() => {
          mutateBrands(); // 브랜드 목록 새로고침
        }}
      />
    </div>
    </>
  );
}
