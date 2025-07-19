// app/components/upload/VideoUpload.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/app/components/ui/Button";
import { LoadingSpinner } from "@/app/components/ui/Loading";

export interface UploadedVideo {
  id: string;
  publicUrl: string;
  thumbnailUrl: string | null;
  embedUrl: string | null;
  originalName: string;
  size: number;
  duration: number | null;
  status: "UPLOADING" | "PROCESSING" | "ACTIVE";
}

export interface VideoUploadProps {
  // 필수 설정
  category: string; // VideoType에 맞는 카테고리
  
  // 선택적 메타데이터
  ptId?: string;
  ptRecordId?: string;
  recordType?: string;
  autoDeleteDays?: number;
  
  // UI 설정
  maxFiles?: number; // 최대 업로드 파일 수 (기본: 1)
  acceptedTypes?: string[]; // 허용할 파일 타입 (기본: 모든 비디오)
  maxSizeMB?: number; // 최대 파일 크기 MB (기본: 200)
  maxDurationSeconds?: number; // 최대 재생 시간 (기본: 300초)
  
  // 미리보기 설정
  showPreview?: boolean; // 미리보기 표시 여부 (기본: true)
  previewSize?: "sm" | "md" | "lg"; // 미리보기 크기 (기본: md)
  
  // 드래그 앤 드롭 설정
  enableDragDrop?: boolean; // 드래그 앤 드롭 활성화 (기본: true)
  
  // 콜백 함수
  onUploadStart?: () => void;
  onUploadProgress?: (progress: number) => void;
  onUploadComplete?: (videos: UploadedVideo[]) => void;
  onUploadError?: (error: string) => void;
  onRemove?: (videoId: string) => void;
  onProcessingComplete?: (videoId: string) => void; // Stream 처리 완료 시
  
  // 초기값
  defaultVideos?: UploadedVideo[];
  
  // 스타일링
  className?: string;
  disabled?: boolean;
}

const VideoUpload: React.FC<VideoUploadProps> = ({
  category,
  ptId,
  ptRecordId,
  recordType,
  autoDeleteDays,
  maxFiles = 1,
  acceptedTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"],
  maxSizeMB = 200,
  maxDurationSeconds = 300,
  showPreview = true,
  previewSize = "md",
  enableDragDrop = true,
  onUploadStart,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
  onRemove,
  onProcessingComplete,
  defaultVideos = [],
  className = "",
  disabled = false,
}) => {
  const [videos, setVideos] = useState<UploadedVideo[]>(defaultVideos);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 미리보기 크기 설정
  const previewSizeClasses = {
    sm: "w-32 h-18", // 16:9 비율
    md: "w-48 h-27",
    lg: "w-64 h-36",
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

  // 비디오 시간 확인
  const getVideoDuration = useCallback((file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        reject(new Error("비디오 메타데이터를 읽을 수 없습니다."));
      };
      
      video.src = window.URL.createObjectURL(file);
    });
  }, []);

  // 파일 업로드 처리
  const uploadFile = useCallback(async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      onUploadStart?.();

      // 비디오 시간 확인
      let duration: number | null = null;
      try {
        duration = await getVideoDuration(file);
        if (maxDurationSeconds && duration > maxDurationSeconds) {
          throw new Error(`비디오 길이가 ${maxDurationSeconds}초를 초과합니다.`);
        }
      } catch (error) {
        console.warn("비디오 시간 확인 실패:", error);
        // 시간 확인 실패는 업로드를 중단하지 않음
      }

      // 1. 업로드 URL 생성
      const createUrlResponse = await fetch("/api/upload/create-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "video",
          category,
          ptId,
          ptRecordId,
          recordType,
          autoDeleteDays,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          maxDurationSeconds,
        }),
      });

      if (!createUrlResponse.ok) {
        const error = await createUrlResponse.json();
        throw new Error(error.error || "업로드 URL 생성 실패");
      }

      const { uploadUrl, streamId } = await createUrlResponse.json();

      // 2. Cloudflare Stream에 직접 업로드
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("파일 업로드 실패");
      }

      setUploadProgress(60);
      onUploadProgress?.(60);

      // 3. 업로드 완료 처리
      const completeResponse = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "video",
          cloudflareId: streamId,
          category,
          originalName: file.name,
          size: file.size,
          mimeType: file.type,
          duration,
        }),
      });

      if (!completeResponse.ok) {
        const error = await completeResponse.json();
        throw new Error(error.error || "업로드 완료 처리 실패");
      }

      const { media } = await completeResponse.json();
      
      setUploadProgress(100);
      onUploadProgress?.(100);

      const newVideo: UploadedVideo = {
        id: media.id,
        publicUrl: media.publicUrl,
        thumbnailUrl: media.thumbnailUrl,
        embedUrl: media.embedUrl,
        originalName: file.name,
        size: file.size,
        duration: media.duration,
        status: media.status,
      };

      setVideos(prev => [...prev, newVideo]);
      onUploadComplete?.([...videos, newVideo]);

      // Stream 처리 상태 확인 (비동기)
      if (media.status === "PROCESSING") {
        checkStreamProcessingStatus(streamId, media.id);
      }

    } catch (error) {
      console.error("비디오 업로드 오류:", error);
      const errorMessage = error instanceof Error ? error.message : "업로드 실패";
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [category, ptId, ptRecordId, recordType, autoDeleteDays, maxDurationSeconds, videos, getVideoDuration, onUploadStart, onUploadProgress, onUploadComplete, onUploadError]);

  // Stream 처리 상태 확인 (폴링)
  const checkStreamProcessingStatus = useCallback(async (streamId: string, mediaId: string) => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/upload/stream-status/${streamId}`);
        if (response.ok) {
          const { status } = await response.json();
          
          if (status === "ready") {
            // 처리 완료 - 비디오 상태 업데이트
            setVideos(prev => prev.map(video => 
              video.id === mediaId 
                ? { ...video, status: "ACTIVE" }
                : video
            ));
            onProcessingComplete?.(mediaId);
            return true; // 완료됨
          }
        }
        return false; // 아직 처리 중
      } catch (error) {
        console.error("Stream 상태 확인 오류:", error);
        return false;
      }
    };

    // 30초마다 상태 확인 (최대 10분)
    const maxAttempts = 20;
    let attempts = 0;
    
    const interval = setInterval(async () => {
      attempts++;
      const isReady = await checkStatus();
      
      if (isReady || attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 30000);

    // 즉시 한 번 확인
    setTimeout(() => checkStatus(), 5000);
  }, [onProcessingComplete]);

  // 파일 선택 처리
  const handleFileSelect = useCallback(async (files: FileList) => {
    if (disabled || isUploading) return;

    const fileArray = Array.from(files);
    const remainingSlots = maxFiles - videos.length;
    const filesToUpload = fileArray.slice(0, remainingSlots);

    for (const file of filesToUpload) {
      const validationError = validateFile(file);
      if (validationError) {
        onUploadError?.(validationError);
        continue;
      }
      
      await uploadFile(file);
    }
  }, [disabled, isUploading, maxFiles, videos.length, validateFile, uploadFile, onUploadError]);

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

  // 비디오 제거
  const handleRemove = (videoId: string) => {
    setVideos(prev => prev.filter(video => video.id !== videoId));
    onRemove?.(videoId);
  };

  // 업로드 버튼 클릭
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 시간 포맷팅
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const canUploadMore = videos.length < maxFiles;

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
              <div className="text-3xl text-gray-400">🎥</div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  비디오를 업로드하세요
                </p>
                <p className="text-xs text-gray-500">
                  {enableDragDrop ? "드래그 앤 드롭하거나 클릭하여 " : "클릭하여 "}파일을 선택하세요
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  최대 {maxSizeMB}MB, {maxDurationSeconds}초 이하, {acceptedTypes.map(type => type.split("/")[1].toUpperCase()).join(", ")} 형식
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 비디오 미리보기 */}
      {showPreview && videos.length > 0 && (
        <div className="space-y-4">
          {videos.map((video) => (
            <div key={video.id} className="relative group border border-gray-200 rounded-lg p-4">
              <div className="flex items-start space-x-4">
                {/* 썸네일 */}
                <div className={`${previewSizeClasses[previewSize]} rounded-lg overflow-hidden bg-gray-100 flex-shrink-0`}>
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.originalName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      🎥
                    </div>
                  )}
                  
                  {/* 재생 시간 오버레이 */}
                  {video.duration && (
                    <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                      {formatDuration(video.duration)}
                    </div>
                  )}
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {video.originalName}
                      </h4>
                      <div className="mt-1 space-y-1">
                        <p className="text-xs text-gray-500">
                          크기: {(video.size / 1024 / 1024).toFixed(1)}MB
                        </p>
                        {video.duration && (
                          <p className="text-xs text-gray-500">
                            재생 시간: {formatDuration(video.duration)}
                          </p>
                        )}
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            video.status === "ACTIVE" 
                              ? "bg-green-100 text-green-800"
                              : video.status === "PROCESSING"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {video.status === "ACTIVE" ? "완료" : 
                             video.status === "PROCESSING" ? "처리중" : "업로드중"}
                          </span>
                          {video.status === "PROCESSING" && (
                            <span className="text-xs text-gray-500">
                              비디오 처리 중...
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 제거 버튼 */}
                    <button
                      onClick={() => handleRemove(video.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      disabled={disabled || isUploading}
                    >
                      <span className="sr-only">제거</span>
                      ×
                    </button>
                  </div>

                  {/* 임베드 비디오 (처리 완료 시에만) */}
                  {video.status === "ACTIVE" && video.embedUrl && (
                    <div className="mt-3">
                      <iframe
                        src={video.embedUrl}
                        className="w-full h-32 rounded border"
                        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                        allowFullScreen={true}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 상태 정보 */}
      {maxFiles > 1 && (
        <div className="text-xs text-gray-500 text-center">
          {videos.length} / {maxFiles} 개 업로드됨
        </div>
      )}
    </div>
  );
};

export default VideoUpload;