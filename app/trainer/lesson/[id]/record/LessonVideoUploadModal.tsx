// app/trainer/lesson/[id]/record/LessonVideoUploadModal.tsx
"use client";

import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import ExerciseVideoUpload from "@/app/components/media/ExerciseVideoUpload";
import { LoadingSpinner } from "@/app/components/ui/Loading";
import {
  VideoType,
  type VideoUploadRequest,
  type RequestVideoUploadResult,
  type VideoConfirmRequest,
  type ConfirmVideoUploadResult,
} from "@/app/services/media/media.service";

interface LessonVideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  onUploadComplete?: () => void;
}

export default function LessonVideoUploadModal({
  isOpen,
  onClose,
  lessonId,
  onUploadComplete,
}: LessonVideoUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadedCount, setUploadedCount] = useState(0);

  // 비디오 메타데이터 추출
  const getVideoMetadata = (file: File): Promise<{ duration: number }> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.onloadedmetadata = () => {
        resolve({ duration: video.duration });
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => {
        reject(new Error("비디오 메타데이터 로드 실패"));
      };
      video.src = URL.createObjectURL(file);
    });
  };

  // 모달 닫기
  const handleClose = useCallback(() => {
    if (!isUploading) {
      // 모든 state 초기화
      setSelectedFiles([]);
      setUploadProgress("");
      setUploadedCount(0);
      setIsUploading(false);
      onClose();
    }
  }, [isUploading, onClose]);

  // 파일 업로드 처리
  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) {
      alert("업로드할 영상을 선택해주세요.");
      return;
    }

    setIsUploading(true);
    setUploadedCount(0);

    try {
      const uploadedVideos: ConfirmVideoUploadResult[] = [];
      const failedUploads: string[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress(
          `영상 업로드 중... (${i + 1}/${selectedFiles.length})`
        );

        try {
          // 비디오 메타데이터 추출
          const { duration } = await getVideoMetadata(file);

          // 1. 업로드 URL 요청
          const uploadRequestBody: VideoUploadRequest = {
            entityType: "LESSON" as VideoType,
            entityId: lessonId,
            metadata: {
              type: "lesson-exercise",
              duration: duration.toString(),
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

          // 2. 파일을 Cloudflare Stream에 직접 업로드 (TUS 프로토콜 사용)
          const formData = new FormData();
          formData.append("file", file);

          const streamResponse = await fetch(uploadURL, {
            method: "POST",
            body: formData,
          });

          if (!streamResponse.ok) {
            throw new Error("Cloudflare Stream 업로드 실패");
          }

          // 3. DB에 비디오 정보 저장
          const confirmRequestBody: VideoConfirmRequest = {
            cloudflareId: uid,
            entityType: "LESSON",
            entityId: lessonId,
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
          console.error(`${file.name} 업로드 실패:`, error);
          failedUploads.push(file.name);
        }
      }

      // 업로드 완료 메시지
      let message = "";
      if (uploadedVideos.length > 0) {
        message = `${uploadedVideos.length}개의 영상이 업로드되었습니다.`;
        if (uploadedVideos.some((v) => v.duration && v.duration > 0)) {
          message += "\n영상은 처리 후 재생 가능합니다.";
        }
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
  }, [selectedFiles, lessonId, onUploadComplete, handleClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* 모달 오버레이 */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              운동 영상 업로드
            </h2>
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
            <ExerciseVideoUpload
              maxVideos={4}
              maxDurationSeconds={600} // 10분 제한 (트레이너)
              onChange={setSelectedFiles}
              className="mb-6"
            />

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
                disabled={selectedFiles.length === 0 || isUploading}
                className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isUploading
                  ? "업로드 중..."
                  : `업로드 (${selectedFiles.length}개)`}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 업로드 진행 오버레이 */}
      {isUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-60 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">영상 업로드 중</h3>
              <p className="text-gray-600 mb-4">{uploadProgress}</p>
              <p className="text-sm text-yellow-600 mb-4">
                영상은 업로드 후 처리 시간이 필요할 수 있습니다.
              </p>
              {selectedFiles.length > 0 && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          (uploadedCount / selectedFiles.length) * 100
                        }%`,
                      }}
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    {uploadedCount} / {selectedFiles.length} 완료
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
