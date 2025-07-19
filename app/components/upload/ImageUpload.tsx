// app/components/upload/ImageUpload.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/app/components/ui/Button";
import { LoadingSpinner } from "@/app/components/ui/Loading";

export interface UploadedImage {
  id: string;
  publicUrl: string;
  thumbnailUrl: string | null;
  originalName: string;
  size: number;
}

export interface ImageUploadProps {
  // 필수 설정
  category: string; // PhotoType에 맞는 카테고리
  
  // 선택적 메타데이터
  ptId?: string;
  ptRecordId?: string;
  recordType?: string;
  autoDeleteDays?: number;
  
  // UI 설정
  maxFiles?: number; // 최대 업로드 파일 수 (기본: 1)
  acceptedTypes?: string[]; // 허용할 파일 타입 (기본: 모든 이미지)
  maxSizeMB?: number; // 최대 파일 크기 MB (기본: 10)
  
  // 미리보기 설정
  showPreview?: boolean; // 미리보기 표시 여부 (기본: true)
  previewSize?: "sm" | "md" | "lg"; // 미리보기 크기 (기본: md)
  
  // 드래그 앤 드롭 설정
  enableDragDrop?: boolean; // 드래그 앤 드롭 활성화 (기본: true)
  
  // 콜백 함수
  onUploadStart?: () => void;
  onUploadProgress?: (progress: number) => void;
  onUploadComplete?: (images: UploadedImage[]) => void;
  onUploadError?: (error: string) => void;
  onRemove?: (imageId: string) => void;
  
  // 초기값
  defaultImages?: UploadedImage[];
  
  // 스타일링
  className?: string;
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  category,
  ptId,
  ptRecordId,
  recordType,
  autoDeleteDays,
  maxFiles = 1,
  acceptedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"],
  maxSizeMB = 10,
  showPreview = true,
  previewSize = "md",
  enableDragDrop = true,
  onUploadStart,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
  onRemove,
  defaultImages = [],
  className = "",
  disabled = false,
}) => {
  const [images, setImages] = useState<UploadedImage[]>(defaultImages);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 미리보기 크기 설정
  const previewSizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  // 파일 검증
  const validateFile = useCallback((file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `지원하지 않는 파일 형식입니다. (${acceptedTypes.join(", ")})`;
    }
    
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `파일 크기가 ${maxSizeMB}MB를 초과합니다.`;
    }
    
    return null;
  }, [acceptedTypes, maxSizeMB]);

  // 파일 업로드 처리
  const uploadFile = useCallback(async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      onUploadStart?.();

      // 1. 업로드 URL 생성
      const createUrlResponse = await fetch("/api/upload/create-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "image",
          category,
          ptId,
          ptRecordId,
          recordType,
          autoDeleteDays,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        }),
      });

      if (!createUrlResponse.ok) {
        const error = await createUrlResponse.json();
        throw new Error(error.error || "업로드 URL 생성 실패");
      }

      const { uploadUrl, imageId } = await createUrlResponse.json();

      // 2. Cloudflare Images에 직접 업로드
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("파일 업로드 실패");
      }

      setUploadProgress(80);
      onUploadProgress?.(80);

      // 3. 업로드 완료 처리
      const completeResponse = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "image",
          cloudflareId: imageId,
          category,
          originalName: file.name,
          size: file.size,
          mimeType: file.type,
        }),
      });

      if (!completeResponse.ok) {
        const error = await completeResponse.json();
        throw new Error(error.error || "업로드 완료 처리 실패");
      }

      const { media } = await completeResponse.json();
      
      setUploadProgress(100);
      onUploadProgress?.(100);

      const newImage: UploadedImage = {
        id: media.id,
        publicUrl: media.publicUrl,
        thumbnailUrl: media.thumbnailUrl,
        originalName: file.name,
        size: file.size,
      };

      setImages(prev => [...prev, newImage]);
      onUploadComplete?.([...images, newImage]);

    } catch (error) {
      console.error("이미지 업로드 오류:", error);
      const errorMessage = error instanceof Error ? error.message : "업로드 실패";
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [category, ptId, ptRecordId, recordType, autoDeleteDays, images, onUploadStart, onUploadProgress, onUploadComplete, onUploadError]);

  // 파일 선택 처리
  const handleFileSelect = useCallback(async (files: FileList) => {
    if (disabled || isUploading) return;

    const fileArray = Array.from(files);
    const remainingSlots = maxFiles - images.length;
    const filesToUpload = fileArray.slice(0, remainingSlots);

    for (const file of filesToUpload) {
      const validationError = validateFile(file);
      if (validationError) {
        onUploadError?.(validationError);
        continue;
      }
      
      await uploadFile(file);
    }
  }, [disabled, isUploading, maxFiles, images.length, validateFile, uploadFile, onUploadError]);

  // 파일 입력 변경 처리
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      handleFileSelect(files);
    }
    // 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 드래그 앤 드롭 처리
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!enableDragDrop || disabled || isUploading) return;
    
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (!enableDragDrop) return;
    
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!enableDragDrop || disabled || isUploading) return;
    
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files) {
      handleFileSelect(files);
    }
  };

  // 이미지 제거
  const handleRemove = (imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
    onRemove?.(imageId);
  };

  // 업로드 버튼 클릭
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const canUploadMore = images.length < maxFiles;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 업로드 영역 */}
      {canUploadMore && (
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-300"}
            ${disabled || isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-blue-400"}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleUploadClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple={maxFiles > 1}
            accept={acceptedTypes.join(",")}
            onChange={handleInputChange}
            className="hidden"
            disabled={disabled || isUploading}
          />

          {isUploading ? (
            <div className="space-y-3">
              <LoadingSpinner size="lg" />
              <div>
                <p className="text-sm text-gray-600 mb-2">업로드 중...</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{uploadProgress}%</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-3xl text-gray-400">📷</div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  이미지를 업로드하세요
                </p>
                <p className="text-xs text-gray-500">
                  {enableDragDrop ? "드래그 앤 드롭하거나 클릭하여 " : "클릭하여 "}파일을 선택하세요
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  최대 {maxSizeMB}MB, {acceptedTypes.map(type => type.split("/")[1].toUpperCase()).join(", ")} 형식
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 이미지 미리보기 */}
      {showPreview && images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div key={image.id} className="relative group">
              <div className={`${previewSizeClasses[previewSize]} rounded-lg overflow-hidden border border-gray-200`}>
                <img
                  src={image.thumbnailUrl || image.publicUrl}
                  alt={image.originalName}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* 제거 버튼 */}
              <button
                onClick={() => handleRemove(image.id)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={disabled || isUploading}
              >
                ×
              </button>
              
              {/* 파일 정보 */}
              <div className="mt-1">
                <p className="text-xs text-gray-600 truncate">{image.originalName}</p>
                <p className="text-xs text-gray-400">
                  {(image.size / 1024 / 1024).toFixed(1)}MB
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 상태 정보 */}
      {maxFiles > 1 && (
        <div className="text-xs text-gray-500 text-center">
          {images.length} / {maxFiles} 개 업로드됨
        </div>
      )}
    </div>
  );
};

export default ImageUpload;