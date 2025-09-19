"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Upload, FileText, Check, X, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { Card, CardContent } from "@/app/components/ui/Card";
import { getOptimizedImageUrl } from "@/app/lib/utils/media.utils";

interface ExistingImage {
  id: string;
  cloudflareId: string;
}

interface ContractUploadStepProps {
  onNext: (contractImageIds?: string[]) => void;
  onBack: () => void;
  existingImages?: ExistingImage[];
  onImageDeleted?: () => void;
  ptId: string;
}

const ContractUploadStep = ({
  onNext,
  onBack,
  existingImages = [],
  onImageDeleted,
  ptId
}: ContractUploadStepProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // 기존 이미지 관리 상태
  const [currentExistingImages, setCurrentExistingImages] = useState<ExistingImage[]>([]);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  // 기존 이미지 초기화
  useEffect(() => {
    setCurrentExistingImages(existingImages);
  }, [existingImages]);

  // 컴포넌트 언마운트 시 메모리 정리
  useEffect(() => {
    return () => {
      // 미리보기 URL 메모리 해제
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleFileSelect = (files: File[]) => {
    const validFiles: File[] = [];
    const newPreviewUrls: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        alert(`${file.name}은(는) 이미지 파일이 아닙니다.`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        // 10MB 제한
        alert(`${file.name}의 파일 크기는 10MB 이하여야 합니다.`);
        continue;
      }

      validFiles.push(file);
      // 미리보기 URL 생성
      const url = URL.createObjectURL(file);
      newPreviewUrls.push(url);
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(Array.from(files));
    }
  };

  const handleRemoveImage = (index: number) => {
    // URL 메모리 해제
    if (previewUrls[index]) {
      URL.revokeObjectURL(previewUrls[index]);
    }

    // 배열에서 해당 인덱스 제거
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveAllImages = () => {
    // 모든 URL 메모리 해제
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviewUrls([]);
  };

  // 기존 이미지 삭제 함수
  const handleDeleteExistingImage = async (imageId: string) => {
    setDeletingImageId(imageId);

    try {
      const response = await fetch(`/api/media/images/${imageId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '이미지 삭제에 실패했습니다.');
      }

      // UI에서 삭제된 이미지 제거
      setCurrentExistingImages(prev => prev.filter(img => img.id !== imageId));

      // 부모 컴포넌트에 삭제 완료 알림 (SWR mutate 트리거)
      onImageDeleted?.();

    } catch (error) {
      console.error('이미지 삭제 중 오류:', error);
      alert(
        error instanceof Error
          ? error.message
          : '이미지 삭제 중 오류가 발생했습니다.'
      );
    } finally {
      setDeletingImageId(null);
    }
  };

  const handleNext = async () => {
    if (selectedFiles.length === 0) {
      // 파일이 없으면 건너뛰기
      onNext([]);
      return;
    }

    setIsUploading(true);
    const uploadedImageIds: string[] = [];

    try {
      // 각 파일을 순차적으로 업로드
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        // 1. 업로드 URL 요청
        const uploadUrlResponse = await fetch("/api/media/images/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType: "CONTRACT",
            entityId: ptId,
          }),
        });

        if (!uploadUrlResponse.ok) {
          throw new Error(`${file.name} 업로드 URL 생성 실패`);
        }

        const { uploadURL, id: customId } = await uploadUrlResponse.json();

        // 2. Cloudflare에 직접 업로드
        const formData = new FormData();
        formData.append("file", file);

        const uploadResponse = await fetch(uploadURL, {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error(`${file.name} 파일 업로드 실패`);
        }

        // 3. 업로드 확인 및 DB 저장
        const confirmResponse = await fetch("/api/media/images/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cloudflareId: customId,
            entityType: "CONTRACT",
            entityId: ptId,
          }),
        });

        if (!confirmResponse.ok) {
          throw new Error(`${file.name} 업로드 확인 실패`);
        }

        const result = await confirmResponse.json();
        uploadedImageIds.push(result.id);
      }

      // 성공 - 모든 이미지 ID 배열로 반환
      onNext(uploadedImageIds);
    } catch (error) {
      console.error("계약서 업로드 중 오류:", error);
      alert(
        error instanceof Error
          ? error.message
          : "계약서 업로드 중 오류가 발생했습니다."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleSkip = () => {
    onNext([]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                계약서 업로드 (선택사항)
              </h3>
            </div>

            <p className="text-sm text-gray-600">
              자필로 서명한 PT 계약서 사진을 업로드해주세요. 여러 장을 한 번에 선택할 수 있으며, 나중에 업로드하거나 생략할 수 있습니다.
            </p>

            {/* 기존 업로드된 이미지 섹션 */}
            {currentExistingImages.length > 0 && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-green-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500" />
                      <span className="text-sm font-medium text-green-700">
                        업로드된 계약서 {currentExistingImages.length}개
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-4">
                    업로드된 계약서:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentExistingImages.map((image, index) => (
                      <div key={image.id} className="relative">
                        <div className="border rounded border-gray-200 overflow-hidden">
                          <Image
                            src={getOptimizedImageUrl(image.cloudflareId, 'public')}
                            alt={`업로드된 계약서 ${index + 1}`}
                            width={400}
                            height={300}
                            className="w-full h-48 object-contain bg-gray-50"
                          />
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-b">
                          <span className="text-xs text-gray-600">
                            계약서 {index + 1}
                          </span>
                          <Button
                            onClick={() => handleDeleteExistingImage(image.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 ml-2"
                            disabled={isUploading || deletingImageId === image.id}
                          >
                            {deletingImageId === image.id ? (
                              <div className="w-3 h-3 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedFiles.length === 0 ? (
              <div
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center transition-colors
                  ${
                    dragActive
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300"
                  }
                  ${
                    isUploading
                      ? "opacity-50 pointer-events-none"
                      : "cursor-pointer hover:border-gray-400"
                  }
                `}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
                onClick={() =>
                  document.getElementById("contract-file-input")?.click()
                }
              >
                <div className="space-y-3">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-700">
                      계약서 이미지 선택
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      파일을 드래그하거나 클릭하여 선택하세요
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      JPG, PNG 파일 (최대 10MB) - 여러 파일 선택 가능
                    </p>
                  </div>
                </div>

                <input
                  id="contract-file-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-blue-500" />
                      <span className="text-sm font-medium text-blue-700">
                        계약서 이미지 {selectedFiles.length}개가 선택되었습니다.
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() =>
                          document.getElementById("contract-file-input-additional")?.click()
                        }
                        variant="outline"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700"
                        disabled={isUploading}
                      >
                        추가
                      </Button>
                      <Button
                        onClick={handleRemoveAllImages}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        disabled={isUploading}
                      >
                        전체 삭제
                      </Button>
                    </div>
                  </div>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-4">
                      미리보기:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="relative">
                          <div className="border rounded border-gray-200 overflow-hidden">
                            <Image
                              src={previewUrls[index]}
                              alt={`계약서 미리보기 ${index + 1}`}
                              width={400}
                              height={300}
                              className="w-full h-48 object-contain bg-gray-50"
                            />
                          </div>
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-b">
                            <span className="text-xs text-gray-600 truncate">
                              {file.name}
                            </span>
                            <Button
                              onClick={() => handleRemoveImage(index)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 ml-2"
                              disabled={isUploading}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-4 text-center">
                      "다음 단계" 버튼을 클릭하면 {selectedFiles.length}개의 이미지가 업로드됩니다.
                    </p>
                  </div>
                )}

                {/* 숨겨진 파일 입력 (추가 업로드용) */}
                <input
                  id="contract-file-input-additional"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            )}

            {/* 안내 메시지 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800 mb-1">
                    계약서 업로드 안내
                  </p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• 이 단계는 선택사항으로, 건너뛸 수 있습니다.</li>
                    <li>• 여러 장의 계약서를 한 번에 업로드할 수 있습니다.</li>
                    <li>• 자필 서명이 포함된 계약서 사진을 권장합니다.</li>
                    <li>• 업로드한 이미지는 안전하게 보관되며, 법적 효력을 갖습니다.</li>
                    <li>• 기존 계약서는 개별 삭제가 가능하며, 나중에 추가하거나 수정할 수 있습니다.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 버튼 */}
      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline" disabled={isUploading}>
          이전 단계
        </Button>

        <div className="flex gap-3">
          <Button onClick={handleSkip} variant="outline" disabled={isUploading}>
            건너뛰기
          </Button>
          <Button
            onClick={handleNext}
            disabled={isUploading}
            className="min-w-[120px]"
          >
{isUploading
              ? `업로드 중... (${selectedFiles.length}개)`
              : selectedFiles.length > 0
                ? `다음 단계 (${selectedFiles.length}개 업로드)`
                : "다음 단계"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ContractUploadStep;
