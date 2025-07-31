// app/components/media/VideoUploader.tsx
'use client';

import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { validateVideoFile, formatFileSize, formatVideoDuration, calculateUploadProgress } from '@/app/lib/utils/media.utils';
import { toast } from 'react-hot-toast';
import type { EntityType } from '@/app/lib/utils/media.utils';

interface VideoUploaderProps {
  entityType: EntityType;
  entityId?: string;
  onUploadComplete?: (videoId: string) => void;
  onUploadProgress?: (progress: number) => void;
  maxDurationSeconds?: number;
  className?: string;
  useTus?: boolean; // 대용량 파일용 TUS 프로토콜 사용
}

interface UploadResponse {
  uid?: string;
  uploadURL: string;
  protocol: 'direct' | 'tus';
  maxDurationSeconds: number;
}

// 업로드 URL 생성 함수
async function createUploadUrl(
  entityType: EntityType,
  entityId?: string,
  useTus?: boolean
): Promise<UploadResponse> {
  const response = await fetch('/api/media/videos/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      entityType,
      entityId,
      useTus,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '업로드 URL 생성 실패');
  }

  return response.json();
}

// Direct Upload 함수
async function uploadVideoDirect(
  file: File,
  uploadURL: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const progress = calculateUploadProgress(e.loaded, e.total);
        onProgress?.(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error('비디오 업로드 실패'));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('네트워크 오류'));
    });

    xhr.open('POST', uploadURL);
    const formData = new FormData();
    formData.append('file', file);
    xhr.send(formData);
  });
}

// TUS Upload 함수 (대용량 파일용)
async function uploadVideoTus(
  file: File,
  uploadURL: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  // TUS 클라이언트 라이브러리를 사용하는 것이 권장됨
  // 여기서는 간단한 구현 예시
  const chunkSize = 5 * 1024 * 1024; // 5MB chunks
  let offset = 0;

  while (offset < file.size) {
    const chunk = file.slice(offset, offset + chunkSize);
    const headers: HeadersInit = {
      'Upload-Offset': offset.toString(),
      'Content-Type': 'application/offset+octet-stream',
    };

    if (offset === 0) {
      headers['Upload-Length'] = file.size.toString();
    }

    const response = await fetch(uploadURL, {
      method: 'PATCH',
      headers,
      body: chunk,
    });

    if (!response.ok) {
      throw new Error('TUS 업로드 실패');
    }

    offset += chunk.size;
    const progress = calculateUploadProgress(offset, file.size);
    onProgress?.(progress);
  }
}

export default function VideoUploader({
  entityType,
  entityId,
  onUploadComplete,
  onUploadProgress,
  maxDurationSeconds,
  className = '',
  useTus = false,
}: VideoUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 업로드 뮤테이션
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // 1. 업로드 URL 생성
      const response = await createUploadUrl(entityType, entityId, useTus);
      
      // 2. 비디오 업로드
      const handleProgress = (progress: number) => {
        setUploadProgress(progress);
        onUploadProgress?.(progress);
      };

      if (response.protocol === 'tus') {
        await uploadVideoTus(file, response.uploadURL, handleProgress);
      } else {
        await uploadVideoDirect(file, response.uploadURL, handleProgress);
      }
      
      return response.uid || 'uploaded';
    },
    onSuccess: (videoId) => {
      toast.success('비디오가 업로드되었습니다');
      onUploadComplete?.(videoId);
      setSelectedFile(null);
      setUploadProgress(0);
    },
    onError: (error: Error) => {
      toast.error(error.message || '업로드 중 오류가 발생했습니다');
      setUploadProgress(0);
    },
  });

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 유효성 검사
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      toast.error(validation.error!);
      return;
    }

    setSelectedFile(file);
  };

  // 업로드 시작
  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  };

  // 취소
  const handleCancel = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`${className}`}>
      {/* 파일 선택 영역 */}
      {!selectedFile && !uploadMutation.isPending && (
        <div
          className="border-2 border-dashed border-base-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <svg
            className="w-12 h-12 mx-auto mb-4 text-base-content/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-base-content/70 mb-2">
            클릭하여 비디오를 선택하세요
          </p>
          <p className="text-sm text-base-content/50">
            MP4, WebM, MOV (최대 5GB)
            {maxDurationSeconds && ` • 최대 ${formatVideoDuration(maxDurationSeconds)}`}
          </p>
        </div>
      )}

      {/* 선택된 파일 정보 */}
      {selectedFile && !uploadMutation.isPending && (
        <div className="border border-base-300 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-base-content/70">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleCancel}
            >
              취소
            </button>
          </div>
          <button
            className="btn btn-primary btn-block"
            onClick={handleUpload}
          >
            업로드 시작
          </button>
        </div>
      )}

      {/* 업로드 진행 상황 */}
      {uploadMutation.isPending && (
        <div className="border border-base-300 rounded-lg p-4">
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span>업로드 중...</span>
              <span>{uploadProgress}%</span>
            </div>
            <progress
              className="progress progress-primary w-full"
              value={uploadProgress}
              max="100"
            />
          </div>
          <p className="text-sm text-base-content/70">
            {selectedFile?.name}
          </p>
        </div>
      )}

      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}