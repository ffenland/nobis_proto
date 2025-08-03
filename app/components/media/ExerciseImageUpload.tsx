// app/components/media/ExerciseImageUpload.tsx
'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { 
  validateImageFile, 
  createImagePreviewUrl, 
  revokeImagePreviewUrl,
  formatFileSize,
  getOptimizedImageUrl
} from '@/app/lib/utils/media.utils';
// import { toast } from 'react-hot-toast'; // Commented out as not available
import { X, Camera, Upload, Image as ImageIcon } from 'lucide-react';

interface ExerciseImageUploadProps {
  maxImages?: number;
  onChange?: (files: File[]) => void;
  existingImages?: Array<{
    id: string;
    cloudflareId: string;
    originalName: string;
    size: number;
  }>;
  onRemoveExisting?: (imageId: string) => void;
  className?: string;
}

interface ImagePreview {
  id: string;
  file: File;
  url: string;
  uploading?: boolean;
  error?: string;
}

export default function ExerciseImageUpload({
  maxImages = 5,
  onChange,
  existingImages = [],
  onRemoveExisting,
  className = '',
}: ExerciseImageUploadProps) {
  const [previews, setPreviews] = useState<ImagePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 파일 추가 처리
  const handleAddFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    setPreviews(currentPreviews => {
      const currentTotal = currentPreviews.length + existingImages.length;
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

      if (validFiles.length > 0) {
        const updatedPreviews = [...currentPreviews, ...newPreviews];
        // setTimeout을 사용하여 렌더링 이후에 onChange 호출
        setTimeout(() => {
          onChange?.(updatedPreviews.map(p => p.file));
        }, 0);
        return updatedPreviews;
      }

      if (fileArray.length > availableSlots) {
        alert(`${fileArray.length - availableSlots}개의 파일이 제한을 초과하여 제외되었습니다.`);
      }
      
      return currentPreviews;
    });
  }, [existingImages.length, maxImages, onChange]);

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleAddFiles(files);
    }
    // 같은 파일 재선택 가능하도록 초기화
    e.target.value = '';
  };

  // 미리보기 제거
  const handleRemovePreview = (id: string) => {
    setPreviews(prev => {
      const newPreviews = prev.filter(p => {
        if (p.id === id) {
          revokeImagePreviewUrl(p.url);
          return false;
        }
        return true;
      });
      // setTimeout을 사용하여 렌더링 이후에 onChange 호출
      setTimeout(() => {
        onChange?.(newPreviews.map(p => p.file));
      }, 0);
      return newPreviews;
    });
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleAddFiles(files);
  };

  // 컴포넌트 언마운트 시 URL 정리
  const cleanupPreviews = useCallback(() => {
    previews.forEach(preview => {
      revokeImagePreviewUrl(preview.url);
    });
  }, [previews]);

  // 전체 이미지 수
  const totalImages = previews.length + existingImages.length;
  const canAddMore = totalImages < maxImages;

  return (
    <div className={`${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-gray-700">
          운동 사진 ({totalImages}/{maxImages})
        </label>
        {totalImages > 0 && (
          <button
            type="button"
            onClick={() => {
              cleanupPreviews();
              setPreviews([]);
              onChange?.([]);
            }}
            className="text-xs text-red-600 hover:text-red-700"
          >
            모두 삭제
          </button>
        )}
      </div>

      {/* 이미지 그리드 */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {/* 기존 이미지 */}
        {existingImages.map((image) => (
          <div key={image.id} className="relative aspect-square group">
            <Image
              src={getOptimizedImageUrl(image.cloudflareId, "thumbnail")}
              alt={image.originalName}
              fill
              className="object-cover rounded-lg"
              unoptimized={true}
            />
            {onRemoveExisting && (
              <button
                type="button"
                onClick={() => onRemoveExisting(image.id)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full 
                         opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 
                          text-white text-xs p-1 rounded-b-lg">
              {formatFileSize(image.size)}
            </div>
          </div>
        ))}

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
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 
                          text-white text-xs p-1 rounded-b-lg">
              {formatFileSize(preview.file.size)}
            </div>
          </div>
        ))}

        {/* 추가 버튼 */}
        {canAddMore && (
          <div
            className={`
              aspect-square border-2 border-dashed rounded-lg
              flex flex-col items-center justify-center cursor-pointer
              transition-all
              ${isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400 bg-gray-50'
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
      {canAddMore && (
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
  );
}