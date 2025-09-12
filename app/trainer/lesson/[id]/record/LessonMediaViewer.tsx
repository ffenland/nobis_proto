"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { LoadingSpinner } from "@/app/components/ui/Loading";
import { getOptimizedImageUrl } from "@/app/lib/utils/media.utils";
import {
  getCloudflareStreamThumbnailUrl,
  type ListImagesByEntityResult,
  type ListVideosByEntityResult,
} from "@/app/services/media/media.service";
import CloudflareVideoPlayer from "@/app/components/media/CloudflareVideoPlayer";

interface LessonMediaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  mediaData?: {
    imageList: ListImagesByEntityResult;
    videoList: ListVideosByEntityResult;
  };
  initialIndex?: number;
  onDelete?: (mediaId: string, mediaType: "image" | "video") => Promise<void>;
}

export default function LessonMediaViewer({
  isOpen,
  onClose,
  mediaData,
  initialIndex = 0,
  onDelete,
}: LessonMediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 이미지와 비디오를 하나의 배열로 결합 (이미지 먼저, 비디오 나중에)
  const allMediaItems = [
    ...(mediaData?.imageList || []),
    ...(mediaData?.videoList || []),
  ];

  const currentMedia = allMediaItems[currentIndex];

  // 타입 가드 함수들
  const isVideoItem = (item: any): item is ListVideosByEntityResult[number] => {
    return item && "streamId" in item;
  };

  const isImageItem = (item: any): item is ListImagesByEntityResult[number] => {
    return item && "cloudflareId" in item && !("streamId" in item);
  };

  // useCallback 함수들을 먼저 선언
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : allMediaItems.length - 1));
    setIsVideoPlaying(false);
  }, [allMediaItems.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < allMediaItems.length - 1 ? prev + 1 : 0));
    setIsVideoPlaying(false);
  }, [allMediaItems.length]);

  const toggleVideoPlayback = useCallback(() => {
    setIsVideoPlaying(!isVideoPlaying);
  }, [isVideoPlaying]);

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted]);

  // 인덱스 초기화
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsVideoPlaying(false);
    }
  }, [isOpen, initialIndex]);

  const handleDelete = async () => {
    if (!currentMedia || !onDelete) return;

    const mediaType = isVideoItem(currentMedia) ? "video" : "image";
    const confirmMessage = `이 ${
      mediaType === "image" ? "사진을" : "영상을"
    } 삭제하시겠습니까?`;
    if (!confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      await onDelete(currentMedia.id, mediaType);

      // 삭제 후 처리
      if (allMediaItems.length <= 1) {
        onClose(); // 마지막 미디어였다면 모달 닫기
      } else {
        // 인덱스 조정
        const newIndex =
          currentIndex >= allMediaItems.length - 1 ? 0 : currentIndex;
        setCurrentIndex(newIndex);
      }
    } catch (error) {
      console.error("미디어 삭제 실패:", error);
      alert("미디어 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  // 키보드 이벤트 처리
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
        case " ":
          e.preventDefault();
          if (isVideoItem(currentMedia)) {
            toggleVideoPlayback();
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    currentMedia,
    onClose,
    goToPrevious,
    goToNext,
    toggleVideoPlayback,
  ]);

  if (!isOpen || !allMediaItems.length || !currentMedia) return null;

  return (
    <>
      {/* 모달 오버레이 */}
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
        {/* 헤더 */}
        <div className="absolute top-0 left-0 right-0 z-[60] bg-black bg-opacity-50 p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="text-sm">
                <div className="font-medium">
                  {isVideoItem(currentMedia) ? "동영상" : "이미지"}
                </div>
                <div className="text-gray-300">
                  {currentIndex + 1} / {allMediaItems.length}
                  {isVideoItem(currentMedia) && (
                    <span>
                      {" "}
                      • {Math.floor(currentMedia.duration / 60)}:
                      {String(Math.floor(currentMedia.duration % 60)).padStart(
                        2,
                        "0"
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isVideoItem(currentMedia) && (
                <>
                  <button
                    onClick={toggleMute}
                    className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={toggleVideoPlayback}
                    className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                  >
                    {isVideoPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </button>
                </>
              )}
              {onDelete && (
                <Button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  variant="outline"
                  size="sm"
                  className="bg-red-600 text-white border-red-600 hover:bg-red-700"
                >
                  {isDeleting ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="relative w-full h-full flex items-start justify-center p-4 pt-20">
          {isVideoItem(currentMedia) ? (
            // 비디오 표시 - Cloudflare Stream Player 사용
            <div className="max-w-4xl h-4/5 w-full px-5">
              <CloudflareVideoPlayer
                streamId={currentMedia.streamId}
                autoplay={isVideoPlaying}
                muted={isMuted}
                controls={true}
                onPlay={() => setIsVideoPlaying(true)}
                onPause={() => setIsVideoPlaying(false)}
                onError={(e) => {
                  console.error("비디오 로드 실패:", e);
                }}
              />
            </div>
          ) : (
            // 이미지 표시
            <div className="relative max-w-full max-h-full">
              <Image
                src={getOptimizedImageUrl(
                  (currentMedia as ListImagesByEntityResult[number])
                    .cloudflareId,
                  "public"
                )}
                alt="이미지"
                width={1200}
                height={800}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  console.error("이미지 로드 실패:", e);
                }}
              />
            </div>
          )}

          {/* 네비게이션 버튼 */}
          {allMediaItems.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* 하단 썸네일 네비게이션 */}
        {allMediaItems.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 z-[60] bg-black bg-opacity-50 p-4">
            <div className="flex gap-2 justify-center overflow-x-auto max-w-full">
              {allMediaItems.map((media, index) => (
                <button
                  key={media.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    index === currentIndex
                      ? "border-white"
                      : "border-transparent hover:border-gray-400"
                  }`}
                >
                  {isVideoItem(media) ? (
                    <Image
                      src={getCloudflareStreamThumbnailUrl(media.streamId)}
                      alt="비디오 썸네일"
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error("비디오 썸네일 로드 실패:", e);
                      }}
                    />
                  ) : (
                    <Image
                      src={
                        (media as ListImagesByEntityResult[number]).thumbnailUrl
                      }
                      alt="이미지"
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
