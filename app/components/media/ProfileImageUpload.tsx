// app/components/media/ProfileImageUpload.tsx
'use client';

import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { getOptimizedImageUrl, validateImageFile, createImagePreviewUrl, revokeImagePreviewUrl } from '@/app/lib/utils/media.utils';
import { toast } from 'react-hot-toast';

interface ProfileImageUploadProps {
  currentImageId?: string;
  onUploadComplete?: (imageId: string) => void;
  className?: string;
}

interface UploadResponse {
  id: string;
  uploadURL: string;
  customId: string;
}

// 업로드 URL 생성 함수
async function createUploadUrl(): Promise<UploadResponse> {
  const response = await fetch('/api/media/images/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      entityType: 'profile',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '업로드 URL 생성 실패');
  }

  return response.json();
}

// 이미지 업로드 함수
async function uploadImage(file: File, uploadURL: string): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(uploadURL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('이미지 업로드 실패');
  }
}

export default function ProfileImageUpload({
  currentImageId,
  onUploadComplete,
  className = '',
}: ProfileImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 업로드 뮤테이션
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // 1. 업로드 URL 생성
      const { uploadURL, customId } = await createUploadUrl();
      
      // 2. 이미지 업로드
      await uploadImage(file, uploadURL);
      
      return customId;
    },
    onSuccess: (imageId) => {
      toast.success('프로필 이미지가 업로드되었습니다');
      onUploadComplete?.(imageId);
      setPreview(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || '업로드 중 오류가 발생했습니다');
    },
  });

  // 파일 처리
  const handleFile = (file: File) => {
    // 파일 유효성 검사
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error!);
      return;
    }

    // 기존 프리뷰 정리
    if (preview) {
      revokeImagePreviewUrl(preview);
    }

    // 새 프리뷰 생성
    const previewUrl = createImagePreviewUrl(file);
    setPreview(previewUrl);

    // 업로드 시작
    uploadMutation.mutate(file);
  };

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFile(file);
    }
  };

  // 현재 이미지 URL
  const currentImageUrl = currentImageId 
    ? getOptimizedImageUrl(currentImageId, 'avatar')
    : null;

  // 표시할 이미지 URL (프리뷰 우선)
  const displayImageUrl = preview || currentImageUrl;

  return (
    <div className={`relative ${className}`}>
      {/* 이미지 표시 영역 */}
      <div
        className={`
          relative w-32 h-32 rounded-full overflow-hidden border-2 border-dashed
          ${isDragging ? 'border-primary bg-primary/10' : 'border-base-300'}
          ${uploadMutation.isPending ? 'opacity-50' : ''}
          cursor-pointer transition-all
        `}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {displayImageUrl ? (
          <img
            src={displayImageUrl}
            alt="프로필 이미지"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-base-content/50">
            <svg
              className="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
        )}

        {/* 업로드 중 오버레이 */}
        {uploadMutation.isPending && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="loading loading-spinner loading-md text-white"></span>
          </div>
        )}
      </div>

      {/* 업로드 버튼 */}
      <button
        type="button"
        className="btn btn-sm btn-primary mt-2 w-full"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploadMutation.isPending}
      >
        {uploadMutation.isPending ? '업로드 중...' : '이미지 변경'}
      </button>

      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 안내 텍스트 */}
      <p className="text-xs text-base-content/70 mt-2 text-center">
        JPG, PNG, WebP, GIF (최대 10MB)
      </p>
    </div>
  );
}