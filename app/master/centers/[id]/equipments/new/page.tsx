"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWRMutation from "swr/mutation";
import { X, Plus } from "lucide-react";
import Image from "next/image";

type Params = Promise<{ id: string }>;

// Equipment 생성 데이터 타입
interface CreateEquipmentData {
  title: string;
  unit?: string;
}

// Create equipment fetcher
const createEquipmentFetcher = async (
  url: string,
  { arg }: { arg: CreateEquipmentData }
) => {
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
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("kg");

  // 이미지 상태
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Get centerId from params
  useEffect(() => {
    params.then((p) => setCenterId(p.id));
  }, [params]);

  // Create equipment mutation
  const { trigger: createEquipment } = useSWRMutation(
    centerId ? `/api/fitness-center/${centerId}/equipments` : null,
    createEquipmentFetcher
  );

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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("장비명을 입력해주세요.");
      return;
    }

    const confirmMessage = selectedFiles.length > 0
      ? `${selectedFiles.length}개의 이미지와 함께 장비를 생성하시겠습니까?`
      : `"${title}" 장비를 생성하시겠습니까?`;

    const confirmCreate = window.confirm(confirmMessage);
    if (!confirmCreate) return;

    setIsUploading(true);

    try {
      // 1. 장비 생성 단계 (이미지 없이)
      setUploadProgress(20);

      const equipmentData = {
        title: title.trim(),
        unit: unit.trim() || undefined, // 비어있으면 undefined로 전달
      };

      const equipmentResult = await createEquipment(equipmentData);
      const equipmentId = equipmentResult.id;

      setUploadProgress(40);

      // 2. 이미지 업로드 및 연결 단계 (이미지가 있을 때만)
      if (selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          setUploadProgress(40 + ((i + 1) / selectedFiles.length) * 40); // 40%~80%

          // Upload URL 요청
          const uploadUrlResponse = await fetch("/api/media/images/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              entityType: "EQUIPMENT",
              entityId: equipmentId, // 생성된 equipmentId 사용
            }),
          });
          if (!uploadUrlResponse.ok) {
            throw new Error("업로드 URL 생성에 실패했습니다.");
          }
          const { uploadURL, id } = await uploadUrlResponse.json();

          // Cloudflare 직접 업로드
          const formData = new FormData();
          formData.append("file", file);
          const uploadResponse = await fetch(uploadURL, {
            method: "POST",
            body: formData,
          });
          if (!uploadResponse.ok) {
            throw new Error("이미지 업로드에 실패했습니다.");
          }

          // 업로드 확인 및 DB 저장 (equipmentId와 연결)
          const confirmResponse = await fetch("/api/media/images/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cloudflareId: id,
              entityType: "EQUIPMENT",
              entityId: equipmentId, // 생성된 equipmentId 사용
            }),
          });
          if (!confirmResponse.ok) {
            throw new Error("업로드 확인에 실패했습니다.");
          }

          // 이미지가 성공적으로 연결됨
        }
      }

      setUploadProgress(100);
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

      <div className="h-full container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">새 장비 등록</h1>

      {/* 사용자 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-800 mb-2">장비 등록 안내</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p>운동에 사용되는 기구를 등록합니다. 세부적으로 등록하지 않으며 일종의 카테고리의 개념으로 등록합니다.</p>
          <p className="font-medium">예시:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>덤벨의 경우: <strong>장비명 &quot;덤벨&quot;</strong>, <strong>단위 &quot;kg&quot;</strong> 또는 <strong>&quot;lb&quot;</strong></li>
            <li>고무밴드의 경우: <strong>장비명 &quot;고무밴드&quot;</strong>, <strong>단위 비워두기</strong></li>
          </ul>
          <p className="text-xs mt-2 text-blue-600">
            💡 추후 운동을 기록할 때 무게값은 직접 입력하실 수 있습니다.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Equipment Title */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">장비명 *</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 덤벨, 순수 원판 10kg"
            required
          />
        </div>

        {/* Equipment Unit */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">단위</span>
            <span className="label-text-alt text-gray-500">선택사항</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="예: kg, lbs, 개, 대 (고무밴드처럼 단위가 없으면 비워두세요)"
          />
        </div>

        {/* 이미지 선택 */}
        <div className="form-control">
          <div className="flex items-center justify-between mb-2">
            <label className="label">
              <span className="label-text">
                이미지 ({selectedFiles.length}/3)
              </span>
              <span className="label-text-alt text-gray-500">선택사항</span>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Selected images (preview only) */}
            {selectedFiles.map((_, index) => (
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
            ))}

            {/* Add new image button */}
            {selectedFiles.length < 3 && (
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
            )}
          </div>
        </div>

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
      </div>
    </>
  );
}
