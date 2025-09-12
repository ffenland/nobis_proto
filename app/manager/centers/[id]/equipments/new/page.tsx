"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { X, Plus } from "lucide-react";
import Image from "next/image";
import { getOptimizedImageUrl } from "@/app/lib/utils/media.utils";
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

  // Image state - pending images system
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [pendingImagePreviews, setPendingImagePreviews] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadedImageIds, setUploadedImageIds] = useState<string[]>([]);

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
  const { trigger: createEquipments, isMutating } = useSWRMutation(
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

  // Handle adding image to pending list (preview only)
  const handleAddImage = (file: File) => {
    const currentCount = pendingImages.length;

    if (currentCount >= 3) {
      alert("최대 3개까지만 이미지를 추가할 수 있습니다.");
      return;
    }

    // Add to pending images
    setPendingImages((prev) => [...prev, file]);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setPendingImagePreviews((prev) => [...prev, previewUrl]);
  };

  // Remove pending image
  const handleRemovePendingImage = (index: number) => {
    // Revoke preview URL to free memory
    URL.revokeObjectURL(pendingImagePreviews[index]);

    setPendingImages((prev) => prev.filter((_, i) => i !== index));
    setPendingImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Save all pending images with integrated media system
  const handleSaveImages = async () => {
    if (pendingImages.length === 0) {
      alert("저장할 이미지가 없습니다.");
      return;
    }

    setIsUploadingImages(true);
    let successCount = 0;
    const failedFiles: string[] = [];
    const uploadedImageIds: string[] = [];

    try {
      for (let i = 0; i < pendingImages.length; i++) {
        const file = pendingImages[i];

        try {
          // Step 1: Request upload URL from integrated media system
          const uploadUrlResponse = await fetch("/api/media/images/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              entityType: "EQUIPMENT",
              entityId: "temp", // 임시 ID (생성시에는 실제 ID를 모름)
            }),
          });

          if (!uploadUrlResponse.ok) {
            const error = await uploadUrlResponse.json();
            throw new Error(error.error || "Failed to get upload URL");
          }

          const { uploadURL, id } = await uploadUrlResponse.json();

          // Step 2: Upload directly to Cloudflare
          const formData = new FormData();
          formData.append("file", file);

          const cloudflareResponse = await fetch(uploadURL, {
            method: "POST",
            body: formData,
          });

          if (!cloudflareResponse.ok) {
            throw new Error("Failed to upload to Cloudflare");
          }

          uploadedImageIds.push(id);
          successCount++;
        } catch (error: any) {
          console.error(`${file.name} upload failed:`, error);
          failedFiles.push(file.name);
        }
      }

      // Show result message
      let message = "";
      if (successCount > 0) {
        message = `${successCount}개의 이미지가 성공적으로 준비되었습니다.`;
      }
      if (failedFiles.length > 0) {
        message += `\n\n실패한 파일 (${
          failedFiles.length
        }개): ${failedFiles.join(", ")}`;
      }

      if (successCount > 0) {
        alert(message);
        // Clear pending images
        setPendingImages([]);
        pendingImagePreviews.forEach((url) => URL.revokeObjectURL(url));
        setPendingImagePreviews([]);
        
        // Store uploaded image IDs for form submission
        setUploadedImageIds(uploadedImageIds);
      } else {
        alert("모든 이미지 업로드에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("Image upload failed:", error);
      alert("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploadingImages(false);
    }
  };

  // Cancel pending images
  const handleCancelPendingImages = () => {
    // Revoke all preview URLs to free memory
    pendingImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setPendingImages([]);
    setPendingImagePreviews([]);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedGroupId || primaryValues.length === 0) {
      alert("그룹과 최소 하나의 값을 입력해주세요.");
      return;
    }

    try {
      // Get current user session for image upload
      const sessionResponse = await fetch("/api/auth/session");
      const session = await sessionResponse.json();

      const equipmentData = {
        groupId: selectedGroupId,
        brandId: selectedBrandId || undefined,
        primaryValues,
        primaryUnit,
        secondaryValue: secondaryValue || undefined,
        secondaryUnit: secondaryUnit || undefined,
        description: description || undefined,
        model: model || undefined,
        images: uploadedImageIds.map((cloudflareId) => ({
          cloudflareId,
          uploadedById: session.id,
        })),
      };

      await createEquipments(equipmentData);

      alert("장비가 성공적으로 생성되었습니다!");
      router.push(`/manager/centers/${centerId}/equipments`);
    } catch (error) {
      console.error("Failed to create equipment:", error);
      alert("장비 생성에 실패했습니다.");
    }
  };

  return (
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

        {/* Image Upload */}
        <div className="form-control">
          <div className="flex items-center justify-between mb-2">
            <label className="label">
              <span className="label-text">
                이미지 ({uploadedImageIds.length + pendingImages.length}/3)
              </span>
            </label>
            {pendingImages.length > 0 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCancelPendingImages}
                  disabled={isUploadingImages}
                  className="btn btn-sm btn-ghost"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSaveImages}
                  disabled={isUploadingImages}
                  className="btn btn-sm btn-primary"
                >
                  {isUploadingImages ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      업로드 중...
                    </>
                  ) : (
                    `업로드 (${pendingImages.length}개)`
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Uploaded images */}
            {uploadedImageIds.map((imageId) => (
              <div key={imageId} className="relative">
                <Image
                  src={getOptimizedImageUrl(imageId, "thumbnail")}
                  alt="Equipment"
                  width={128}
                  height={128}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    setUploadedImageIds(uploadedImageIds.filter((id) => id !== imageId));
                  }}
                  className="absolute top-2 right-2 btn btn-circle btn-xs btn-error"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Pending images (preview only) */}
            {pendingImages.map((_, index) => (
              <div key={`pending-${index}`} className="relative">
                <Image
                  src={pendingImagePreviews[index]}
                  alt="Pending upload"
                  width={128}
                  height={128}
                  className="w-full h-32 object-cover rounded-lg border-2 border-dashed border-blue-300"
                />
                <button
                  type="button"
                  onClick={() => handleRemovePendingImage(index)}
                  disabled={isUploadingImages}
                  className="absolute top-2 right-2 btn btn-circle btn-xs btn-warning"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-1 left-1 right-1">
                  <div className="bg-blue-500 bg-opacity-90 text-white text-xs px-2 py-1 rounded text-center">
                    미저장
                  </div>
                </div>
              </div>
            ))}

            {/* Add new image button */}
            {uploadedImageIds.length + pendingImages.length < 3 && (
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
                    disabled={isUploadingImages}
                  />
                  <div className="text-center">
                    <Plus className="w-8 h-8 mx-auto text-gray-400" />
                    <span className="text-sm text-gray-500">이미지 추가</span>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            className="btn btn-primary flex-1"
            disabled={isMutating}
          >
            {isMutating ? (
              <span className="loading loading-spinner"></span>
            ) : (
              "장비 생성"
            )}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => router.back()}
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
  );
}
