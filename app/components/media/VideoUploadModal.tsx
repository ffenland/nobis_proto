// app/components/media/VideoUploadModal.tsx
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { X, Upload, Camera, Video, AlertCircle } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { LoadingSpinner } from "@/app/components/ui/Loading";
import {
  validateVideoFile,
  formatFileSize,
  formatVideoDuration,
} from "@/app/lib/utils/media.utils";
import {
  VideoType,
  type VideoUploadRequest,
  type RequestVideoUploadResult,
  type VideoConfirmRequest,
  type ConfirmVideoUploadResult,
} from "@/app/services/media/media.service";

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: VideoType;
  entityId: string;
  onUploadComplete?: () => void;

  // 커스터마이징 옵션
  title?: string; // 기본값: "영상 업로드"
  maxVideos?: number; // 기본값: 4
  maxDurationSeconds?: number; // 기본값: 600 (10분, 초 단위)
  maxFileSizeMB?: number; // 기본값: 500 (MB 단위)
}

interface VideoPreview {
  id: string;
  file: File;
  thumbnailUrl: string;
  duration: number;
}

export default function VideoUploadModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  onUploadComplete,
  title = "영상 업로드",
  maxVideos = 4,
  maxDurationSeconds = 600,
  maxFileSizeMB = 500,
}: VideoUploadModalProps) {
  const [previews, setPreviews] = useState<VideoPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadedCount, setUploadedCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 비디오 파일에서 썸네일 및 메타데이터 생성
  const generateThumbnail = async (
    file: File
  ): Promise<{ thumbnailUrl: string; duration: number }> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      video.onloadedmetadata = () => {
        // 비디오 중간 지점으로 이동
        video.currentTime = video.duration / 2;
      };

      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx?.drawImage(video, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const thumbnailUrl = URL.createObjectURL(blob);
              resolve({ thumbnailUrl, duration: video.duration });
            } else {
              reject(new Error("썸네일 생성 실패"));
            }
            URL.revokeObjectURL(video.src);
          },
          "image/jpeg",
          0.7
        );
      };

      video.onerror = () => {
        reject(new Error("비디오 로드 실패"));
      };

      video.src = URL.createObjectURL(file);
    });
  };

  // 파일 추가 처리
  const handleAddFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      const availableSlots = maxVideos - previews.length;

      if (availableSlots <= 0) {
        alert(`최대 ${maxVideos}개의 영상만 업로드할 수 있습니다.`);
        return;
      }

      const newPreviews: VideoPreview[] = [];

      for (let i = 0; i < Math.min(fileArray.length, availableSlots); i++) {
        const file = fileArray[i];

        // 파일 타입 검증
        const validation = validateVideoFile(file);
        if (!validation.valid) {
          alert(`${file.name}: ${validation.error}`);
          continue;
        }

        // 파일 크기 검증
        if (file.size > maxFileSizeMB * 1024 * 1024) {
          alert(
            `${file.name}: 파일 크기는 최대 ${maxFileSizeMB}MB까지 가능합니다.`
          );
          continue;
        }

        try {
          const { thumbnailUrl, duration } = await generateThumbnail(file);

          // 영상 길이 검증
          if (duration > maxDurationSeconds) {
            alert(
              `${file.name}: 최대 ${formatVideoDuration(
                maxDurationSeconds
              )}까지만 가능합니다.`
            );
            URL.revokeObjectURL(thumbnailUrl);
            continue;
          }

          newPreviews.push({
            id: `preview-${Date.now()}-${i}`,
            file,
            thumbnailUrl,
            duration,
          });
        } catch (error) {
          console.error(`${file.name} 처리 실패:`, error);
          alert(`${file.name}: 썸네일 생성 실패`);
        }
      }

      if (newPreviews.length > 0) {
        setPreviews((prev) => [...prev, ...newPreviews]);
      }

      if (fileArray.length > availableSlots) {
        alert(
          `${
            fileArray.length - availableSlots
          }개의 파일이 제한을 초과하여 제외되었습니다.`
        );
      }
    },
    [previews.length, maxVideos, maxDurationSeconds, maxFileSizeMB]
  );

  // 파일 선택 핸들러
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      await handleAddFiles(files);
    }
    // 같은 파일 재선택 가능하도록 초기화
    e.target.value = "";
  };

  // 미리보기 제거
  const handleRemovePreview = (id: string) => {
    setPreviews((prev) =>
      prev.filter((p) => {
        if (p.id === id) {
          URL.revokeObjectURL(p.thumbnailUrl);
          return false;
        }
        return true;
      })
    );
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

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    await handleAddFiles(files);
  };

  // 모달 닫기
  const handleClose = useCallback(() => {
    if (!isUploading) {
      // URL 정리
      previews.forEach((preview) => {
        URL.revokeObjectURL(preview.thumbnailUrl);
      });
      // 모든 state 초기화
      setPreviews([]);
      setUploadProgress("");
      setUploadedCount(0);
      setIsUploading(false);
      onClose();
    }
  }, [isUploading, previews, onClose]);

  // 파일 업로드 처리
  const handleUpload = useCallback(async () => {
    if (previews.length === 0) {
      alert("업로드할 영상을 선택해주세요.");
      return;
    }

    setIsUploading(true);
    setUploadedCount(0);

    try {
      const uploadedVideos: ConfirmVideoUploadResult[] = [];
      const failedUploads: string[] = [];

      for (let i = 0; i < previews.length; i++) {
        const preview = previews[i];
        setUploadProgress(
          `영상 업로드 중... (${i + 1}/${previews.length})`
        );

        try {
          // 1. 업로드 URL 요청
          const uploadRequestBody: VideoUploadRequest = {
            entityType: entityType,
            entityId: entityId,
            metadata: {
              duration: preview.duration.toString(),
              originalName: preview.file.name,
            },
          };

          const uploadResponse = await fetch("/api/media/videos/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(uploadRequestBody),
          });

          if (!uploadResponse.ok) {
            const errorData: { error: string } = await uploadResponse.json();
            throw new Error(errorData.error || "업로드 URL 생성 실패");
          }

          const { uploadURL, uid }: RequestVideoUploadResult =
            await uploadResponse.json();

          // 2. 파일을 Cloudflare Stream에 직접 업로드
          const formData = new FormData();
          formData.append("file", preview.file);

          const streamResponse = await fetch(uploadURL, {
            method: "POST",
            body: formData,
          });

          if (!streamResponse.ok) {
            throw new Error("Cloudflare Stream 업로드 실패");
          }

          // 3. DB에 비디오 정보 저장
          const confirmRequestBody: VideoConfirmRequest = {
            streamId: uid,
            entityType: entityType,
            entityId: entityId,
          };

          const saveResponse = await fetch("/api/media/videos/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(confirmRequestBody),
          });

          if (!saveResponse.ok) {
            const errorData: { error: string } = await saveResponse.json();
            throw new Error(errorData.error || "비디오 정보 저장 실패");
          }

          const savedVideo: ConfirmVideoUploadResult =
            await saveResponse.json();
          uploadedVideos.push(savedVideo);
          setUploadedCount(i + 1);
        } catch (error) {
          console.error(`${preview.file.name} 업로드 실패:`, error);
          failedUploads.push(preview.file.name);
        }
      }

      // 업로드 완료 메시지
      let message = "";
      if (uploadedVideos.length > 0) {
        message = `${uploadedVideos.length}개의 영상이 업로드되었습니다.`;
      }
      if (failedUploads.length > 0) {
        message += `\n\n실패한 파일 (${
          failedUploads.length
        }개): ${failedUploads.join(", ")}`;
      }

      if (uploadedVideos.length > 0) {
        alert(message);
        onUploadComplete?.();
        handleClose();
      } else {
        alert("모든 영상 업로드가 실패했습니다.");
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

  // 컴포넌트 언마운트 시 URL 정리
  useEffect(() => {
    return () => {
      previews.forEach((preview) => {
        URL.revokeObjectURL(preview.thumbnailUrl);
      });
    };
  }, [previews]);

  if (!isOpen) return null;

  const canAddMore = previews.length < maxVideos;

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
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">
                영상 ({previews.length}/{maxVideos})
              </label>
              {previews.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    previews.forEach((p) => URL.revokeObjectURL(p.thumbnailUrl));
                    setPreviews([]);
                  }}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  모두 삭제
                </button>
              )}
            </div>

            {/* 제한 경고 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-yellow-800">
                <p className="font-medium">
                  최대 {formatVideoDuration(maxDurationSeconds)} 길이, {maxFileSizeMB}MB 이하의 영상만 업로드 가능합니다.
                </p>
                <p>제한을 초과하는 영상은 자동으로 거부됩니다.</p>
              </div>
            </div>

            {/* 비디오 그리드 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* 미리보기 비디오 */}
              {previews.map((preview) => (
                <div key={preview.id} className="relative aspect-video group">
                  <Image
                    src={preview.thumbnailUrl}
                    alt={preview.file.name}
                    fill
                    className="object-cover rounded-lg"
                    unoptimized={true}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePreview(preview.id)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full
                             opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60
                              text-white text-xs p-2 rounded-b-lg flex justify-between"
                  >
                    <span>{formatFileSize(preview.file.size)}</span>
                    <span>{formatVideoDuration(preview.duration)}</span>
                  </div>
                </div>
              ))}

              {/* 추가 버튼 */}
              {canAddMore && (
                <div
                  className={`
                    aspect-video border-2 border-dashed rounded-lg
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
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">영상 추가</span>
                </div>
              )}
            </div>

            {/* 버튼 그룹 */}
            {canAddMore && (
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2 px-3 border border-gray-300 rounded-lg text-sm
                           hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  갤러리에서 선택
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 py-2 px-3 border border-gray-300 rounded-lg text-sm
                           hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  영상 촬영
                </button>
              </div>
            )}

            {/* 안내 텍스트 */}
            <p className="text-xs text-gray-500 mb-6">
              MP4, MOV, WebM 형식 • 최대 {maxFileSizeMB}MB • 최대 {maxVideos}개
              • 최대 {formatVideoDuration(maxDurationSeconds)}
            </p>

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
                {isUploading
                  ? "업로드 중..."
                  : `업로드 (${previews.length}개)`}
              </Button>
            </div>
          </div>

          {/* 숨겨진 입력 */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* 업로드 진행 오버레이 */}
      {isUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">영상 업로드 중</h3>
              <p className="text-gray-600 mb-4">{uploadProgress}</p>
              <p className="text-sm text-yellow-600 mb-4">
                영상은 업로드 후 처리 시간이 필요할 수 있습니다.
              </p>
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
