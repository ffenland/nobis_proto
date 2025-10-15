// app/components/media/ImageUploadModal.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { X, Camera, Upload, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { Button } from "@/app/components/ui/Button";
import { LoadingSpinner } from "@/app/components/ui/Loading";
import {
  validateImageFile,
  createImagePreviewUrl,
  revokeImagePreviewUrl,
  formatFileSize,
} from "@/app/lib/utils/media.utils";
import {
  ImageType,
  type ImageUploadRequest,
  type RequestImageUploadResult,
  type ConfirmImageUploadResult,
} from "@/app/services/media/media.service";

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: ImageType;
  entityId: string;
  onUploadComplete?: () => void;

  // 커스터마이징 옵션
  title?: string; // 기본값: "이미지 업로드"
  maxImages?: number; // 기본값: 10
  maxFileSizeMB?: number; // 기본값: 10 (MB 단위)
}

interface ImagePreview {
  id: string;
  file: File;
  url: string;
}

export default function ImageUploadModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  onUploadComplete,
  title = "이미지 업로드",
  maxImages = 10,
}: ImageUploadModalProps) {
  const [previews, setPreviews] = useState<ImagePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadedCount, setUploadedCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 모달 닫기
  const handleClose = useCallback(() => {
    if (!isUploading) {
      // preview URL 정리
      previews.forEach((preview) => {
        revokeImagePreviewUrl(preview.url);
      });
      // 모든 state 초기화
      setPreviews([]);
      setUploadProgress("");
      setUploadedCount(0);
      setIsUploading(false);
      setIsDragging(false);
      onClose();
    }
  }, [isUploading, previews, onClose]);

  // 파일 추가 처리
  const handleAddFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      setPreviews((currentPreviews) => {
        const currentTotal = currentPreviews.length;
        const availableSlots = maxImages - currentTotal;

        if (availableSlots <= 0) {
          alert(`최대 ${maxImages}개의 이미지만 업로드할 수 있습니다.`);
          return currentPreviews;
        }

        const validFiles: File[] = [];
        const newPreviews: ImagePreview[] = [];

        for (let i = 0; i < Math.min(fileArray.length, availableSlots); i++) {
          const file = fileArray[i];
          const validation = validateImageFile(file);

          if (!validation.valid) {
            alert(`${file.name}: ${validation.error}`);
            continue;
          }

          validFiles.push(file);
          newPreviews.push({
            id: `preview-${Date.now()}-${i}`,
            file,
            url: createImagePreviewUrl(file),
          });
        }

        if (fileArray.length > availableSlots) {
          alert(
            `${
              fileArray.length - availableSlots
            }개의 파일이 제한을 초과하여 제외되었습니다.`
          );
        }

        return [...currentPreviews, ...newPreviews];
      });
    },
    [maxImages]
  );

  // 파일 선택 핸들러
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        handleAddFiles(files);
      }
      // 같은 파일 재선택 가능하도록 초기화
      e.target.value = "";
    },
    [handleAddFiles]
  );

  // 미리보기 제거
  const handleRemovePreview = useCallback((id: string) => {
    setPreviews((prev) => {
      return prev.filter((p) => {
        if (p.id === id) {
          revokeImagePreviewUrl(p.url);
          return false;
        }
        return true;
      });
    });
  }, []);

  // 드래그 앤 드롭 핸들러
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      handleAddFiles(files);
    },
    [handleAddFiles]
  );

  // 모두 삭제
  const handleClearAll = useCallback(() => {
    previews.forEach((preview) => {
      revokeImagePreviewUrl(preview.url);
    });
    setPreviews([]);
  }, [previews]);

  // 파일 업로드 처리
  const handleUpload = useCallback(async () => {
    if (previews.length === 0) {
      alert("업로드할 이미지를 선택해주세요.");
      return;
    }

    setIsUploading(true);
    setUploadedCount(0);

    try {
      const uploadedImages: ConfirmImageUploadResult[] = [];
      const failedUploads: string[] = [];

      for (let i = 0; i < previews.length; i++) {
        const { file } = previews[i];
        setUploadProgress(
          `이미지 업로드 중... (${i + 1}/${previews.length})`
        );

        try {
          // 1. 업로드 URL 요청
          const requestBody: ImageUploadRequest = {
            entityType: entityType,
            entityId: entityId,
            metadata: {
              originalName: file.name,
              size: file.size.toString(),
            },
          };

          const uploadResponse = await fetch("/api/media/images/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          });

          if (!uploadResponse.ok) {
            const errorData: { error: string } = await uploadResponse.json();
            throw new Error(errorData.error || "업로드 URL 생성 실패");
          }

          const { uploadURL, id }: RequestImageUploadResult =
            await uploadResponse.json();

          // 2. 파일을 Cloudflare에 직접 업로드
          const formData = new FormData();
          formData.append("file", file);

          const cloudflareResponse = await fetch(uploadURL, {
            method: "POST",
            body: formData,
          });

          if (!cloudflareResponse.ok) {
            throw new Error("Cloudflare 업로드 실패");
          }

          // 3. DB에 이미지 정보 저장
          const saveResponse = await fetch("/api/media/images/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cloudflareId: id,
              entityType: entityType,
              entityId: entityId,
            }),
          });

          if (!saveResponse.ok) {
            const errorData: { error: string } = await saveResponse.json();
            throw new Error(errorData.error || "이미지 정보 저장 실패");
          }

          const savedImage: ConfirmImageUploadResult =
            await saveResponse.json();
          uploadedImages.push(savedImage);
          setUploadedCount(i + 1);
        } catch (error) {
          console.error(`${file.name} 업로드 실패:`, error);
          failedUploads.push(file.name);
        }
      }

      // 업로드 완료 메시지
      let message = "";
      if (uploadedImages.length > 0) {
        message = `${uploadedImages.length}개의 이미지가 업로드되었습니다.`;
      }
      if (failedUploads.length > 0) {
        message += `\n\n실패한 파일 (${
          failedUploads.length
        }개): ${failedUploads.join(", ")}`;
      }

      if (uploadedImages.length > 0) {
        alert(message);
        onUploadComplete?.();
        handleClose();
      } else {
        alert("모든 이미지 업로드가 실패했습니다.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "업로드 중 오류가 발생했습니다."
      );
    } finally {
      setIsUploading(false);
      setUploadProgress("");
      setUploadedCount(0);
    }
  }, [previews, entityType, entityId, onUploadComplete, handleClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* 모달 오버레이 */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 컨텐츠 */}
          <div className="p-6">
            {/* 이미지 업로드 UI */}
            <div className="mb-6">
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">
                  이미지 ({previews.length}/{maxImages})
                </label>
                {previews.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    모두 삭제
                  </button>
                )}
              </div>

              {/* 이미지 그리드 */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {/* 미리보기 이미지 */}
                {previews.map((preview) => (
                  <div key={preview.id} className="relative aspect-square group">
                    <Image
                      src={preview.url}
                      alt={preview.file.name}
                      fill
                      className="object-cover rounded-lg"
                      unoptimized={true}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePreview(preview.id)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full
                               opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50
                                text-white text-xs p-1 rounded-b-lg"
                    >
                      {formatFileSize(preview.file.size)}
                    </div>
                  </div>
                ))}

                {/* 추가 버튼 */}
                {previews.length < maxImages && (
                  <div
                    className={`
                      aspect-square border-2 border-dashed rounded-lg
                      flex flex-col items-center justify-center cursor-pointer
                      transition-all
                      ${
                        isDragging
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-300 hover:border-gray-400 bg-gray-50"
                      }
                    `}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">추가</span>
                  </div>
                )}
              </div>

              {/* 버튼 그룹 */}
              {previews.length < maxImages && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 px-3 border border-gray-300 rounded-lg text-sm
                             hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4" />
                    갤러리에서 선택
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex-1 py-2 px-3 border border-gray-300 rounded-lg text-sm
                             hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    사진 촬영
                  </button>
                </div>
              )}

              {/* 숨겨진 입력 */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* 안내 텍스트 */}
              <p className="text-xs text-gray-500 mt-2">
                JPG, PNG, WebP, GIF 형식 • 최대 10MB • 최대 {maxImages}개
              </p>
            </div>

            {/* 업로드 버튼 */}
            <div className="flex justify-end gap-3">
              <Button
                onClick={handleClose}
                disabled={isUploading}
                variant="outline"
              >
                취소
              </Button>
              <Button
                onClick={handleUpload}
                disabled={previews.length === 0 || isUploading}
                className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isUploading ? "업로드 중..." : `업로드 (${previews.length}개)`}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 업로드 진행 오버레이 */}
      {isUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">이미지 업로드 중</h3>
              <p className="text-gray-600 mb-4">{uploadProgress}</p>
              {previews.length > 0 && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(uploadedCount / previews.length) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    {uploadedCount} / {previews.length} 완료
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
