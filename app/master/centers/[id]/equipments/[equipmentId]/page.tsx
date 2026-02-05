"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { ArrowLeft, Trash2, X, Plus } from "lucide-react";
import Image from "next/image";
import { getOptimizedImageUrl } from "@/app/lib/utils/media.utils";
import { GetEquipmentByIdResult } from "@/app/services/fitness-center/equipment.service";

type Params = Promise<{ id: string; equipmentId: string }>;

// Fetcher functions
const fetcher = (url: string) => fetch(url).then((res) => res.json());

const deleteEquipmentFetcher = async (url: string) => {
  const response = await fetch(url, { method: "DELETE" });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete equipment");
  }
  return response.json();
};

const confirmImageUpload = async (
  cloudflareId: string,
  entityType: string,
  entityId: string
) => {
  const response = await fetch("/api/media/images/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cloudflareId,
      entityType,
      entityId,
    }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to confirm image upload");
  }
  return response.json();
};

const deleteImageFetcher = async (imageId: string) => {
  const response = await fetch(`/api/media/images/${imageId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete image");
  }
  return response.json();
};

export default function EquipmentDetailPage({ params }: { params: Params }) {
  const router = useRouter();
  const [centerId, setCenterId] = useState<string>("");
  const [equipmentId, setEquipmentId] = useState<string>("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [pendingImagePreviews, setPendingImagePreviews] = useState<string[]>(
    []
  );

  // Get params
  useEffect(() => {
    params.then((p) => {
      setCenterId(p.id);
      setEquipmentId(p.equipmentId);
    });
  }, [params]);

  // Fetch equipment data
  const { data: equipment, mutate } = useSWR<GetEquipmentByIdResult>(
    equipmentId ? `/api/equipments/${equipmentId}` : null,
    fetcher
  );

  // Delete equipment mutation
  const { trigger: deleteEquipment, isMutating: isDeleting } = useSWRMutation(
    equipmentId ? `/api/equipments/${equipmentId}` : null,
    deleteEquipmentFetcher
  );

  // Add images mutation - not needed with integrated media system

  // Handle equipment deletion
  const handleDelete = async () => {
    try {
      await deleteEquipment();
      alert("장비가 성공적으로 삭제되었습니다.");
      router.push(`/manager/centers/${centerId}/equipments`);
    } catch (error: any) {
      console.error("Failed to delete equipment:", error);
      alert(error.message || "장비 삭제에 실패했습니다.");
    }
  };

  // Handle adding image to pending list (preview only)
  const handleAddImage = (file: File) => {
    const existingCount = equipment?.images?.length || 0;
    const pendingCount = pendingImages.length;
    const totalCount = existingCount + pendingCount;

    if (totalCount >= 3) {
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
              entityId: equipmentId,
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

          // Step 3: Confirm upload and save to DB
          await confirmImageUpload(id, "EQUIPMENT", equipmentId);

          successCount++;
        } catch (error: any) {
          console.error(`${file.name} upload failed:`, error);
          failedFiles.push(file.name);
        }
      }

      // Show result message
      let message = "";
      if (successCount > 0) {
        message = `${successCount}개의 이미지가 성공적으로 저장되었습니다.`;
      }
      if (failedFiles.length > 0) {
        message += `\n\n실패한 파일 (${
          failedFiles.length
        }개): ${failedFiles.join(", ")}`;
      }

      if (successCount > 0) {
        alert(message);
        // Clear pending images and refresh equipment data
        setPendingImages([]);
        setPendingImagePreviews((prev) => {
          prev.forEach((url) => URL.revokeObjectURL(url));
          return [];
        });
        mutate();
      } else {
        alert("모든 이미지 저장에 실패했습니다.");
      }
    } catch (error: any) {
      console.error("Image save failed:", error);
      alert("이미지 저장 중 오류가 발생했습니다.");
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

  // Handle image deletion with integrated media system
  const handleImageDelete = async (imageId: string) => {
    if (!confirm("이 이미지를 삭제하시겠습니까?")) return;

    try {
      await deleteImageFetcher(imageId);
      mutate(); // Refresh equipment data
      alert("이미지가 성공적으로 삭제되었습니다.");
    } catch (error: any) {
      console.error("Image delete failed:", error);
      alert(error.message || "이미지 삭제에 실패했습니다.");
    }
  };

  if (!equipment) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  const equipmentTitle = equipment.title;

  return (
    <div className="h-full container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="btn btn-ghost btn-circle"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">{equipmentTitle}</h1>
        </div>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="btn btn-error"
          disabled={isDeleting || isUploadingImages}
        >
          {isDeleting ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          장비 삭제
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Equipment Info */}
        <div className="space-y-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">장비 정보</h2>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-600">장비명:</span>
                  <span className="ml-2">{equipment.title}</span>
                </div>

                <div>
                  <span className="font-medium text-gray-600">단위:</span>
                  <span className="ml-2">
                    {equipment.unit === "none" ? "단위 없음" : equipment.unit}
                  </span>
                </div>

                <div>
                  <span className="font-medium text-gray-600">센터:</span>
                  <span className="ml-2">{equipment.fitnessCenter?.title || "센터 정보 없음"}</span>
                </div>

                <div>
                  <span className="font-medium text-gray-600">등록일:</span>
                  <span className="ml-2">
                    {new Date(equipment.createdAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>

                <div>
                  <span className="font-medium text-gray-600">수정일:</span>
                  <span className="ml-2">
                    {new Date(equipment.updatedAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="space-y-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <h2 className="card-title">
                  이미지 (
                  {(equipment.images?.length || 0) + pendingImages.length}/3)
                </h2>
                {pendingImages.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelPendingImages}
                      disabled={isUploadingImages}
                      className="btn btn-sm btn-ghost"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSaveImages}
                      disabled={isUploadingImages}
                      className="btn btn-sm btn-primary"
                    >
                      {isUploadingImages ? (
                        <>
                          <span className="loading loading-spinner loading-xs"></span>
                          저장 중...
                        </>
                      ) : (
                        `저장하기 (${pendingImages.length}개)`
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Existing saved images */}
                {equipment.images?.map((image) => (
                  <div key={image.id} className="relative">
                    <Image
                      src={getOptimizedImageUrl(
                        image.cloudflareId,
                        "thumbnail"
                      )}
                      alt="Equipment"
                      width={128}
                      height={128}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => handleImageDelete(image.id)}
                      disabled={isUploadingImages}
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
                {(equipment.images?.length || 0) + pendingImages.length < 3 && (
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
                        <span className="text-sm text-gray-500">
                          이미지 추가
                        </span>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">장비 삭제 확인</h3>
            <p className="mb-6">
              <strong>{equipmentTitle}</strong>를 삭제하시겠습니까?
              <br />
              <span className="text-sm text-gray-600">
                이 작업은 되돌릴 수 없으며, 관련된 모든 이미지도 함께
                삭제됩니다.
              </span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="btn btn-error flex-1"
                disabled={isDeleting || isUploadingImages}
              >
                {isDeleting ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  "삭제"
                )}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-ghost"
                disabled={isDeleting || isUploadingImages}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
