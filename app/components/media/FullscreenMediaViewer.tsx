"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Trash2, Star } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { LoadingSpinner } from "@/app/components/ui/Loading";
import { getOptimizedImageUrl } from "@/app/lib/utils/media.utils";
import { getCloudflareStreamThumbnailUrl } from "@/app/services/media/media.service";
import CloudflareVideoPlayer from "@/app/components/media/CloudflareVideoPlayer";

// 미디어 아이템 타입 정의
export interface MediaImage {
  id: string;
  cloudflareId: string;
  thumbnailUrl: string;
  isPrimary?: boolean;
}

export interface MediaVideo {
  id: string;
  streamId: string;
}

export type MediaItem = MediaImage | MediaVideo;

interface FullscreenMediaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItems: MediaItem[];
  initialIndex?: number;
  onDelete?: (mediaId: string, mediaType: "image" | "video") => Promise<void>;
}
// 타입 가드 함수들
export const isVideoItem = (item: MediaItem): item is MediaVideo => {
  return "streamId" in item;
};

export const isImageItem = (item: MediaItem): item is MediaImage => {
  return "cloudflareId" in item && !("streamId" in item);
};

export default function FullscreenMediaViewer({
  isOpen,
  onClose,
  mediaItems,
  initialIndex = 0,
  onDelete,
}: FullscreenMediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSettingPrimary, setIsSettingPrimary] = useState(false);
  const [mediaItemsState, setMediaItemsState] = useState(mediaItems);
  const currentMedia = mediaItemsState[currentIndex];

  // mediaItems prop이 변경되면 state도 업데이트
  useEffect(() => {
    setMediaItemsState(mediaItems);
  }, [mediaItems]);

  // 모달 닫기 핸들러
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // 대표 이미지 설정 버튼 표시 여부: 모든 이미지가 isPrimary 정보를 가지고 있는지 확인
  const showSetPrimaryButton = mediaItemsState
    .filter(
      (item): item is MediaImage =>
        "cloudflareId" in item && !("streamId" in item)
    )
    .every((img) => img.isPrimary !== undefined);

  // useCallback 함수들을 먼저 선언
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) =>
      prev > 0 ? prev - 1 : mediaItemsState.length - 1
    );
  }, [mediaItemsState.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) =>
      prev < mediaItemsState.length - 1 ? prev + 1 : 0
    );
  }, [mediaItemsState.length]);

  // 인덱스 초기화
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
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
      if (mediaItemsState.length <= 1) {
        handleClose(); // 마지막 미디어였다면 모달 닫기
      } else {
        // 인덱스 조정
        const newIndex =
          currentIndex >= mediaItemsState.length - 1 ? 0 : currentIndex;
        setCurrentIndex(newIndex);
      }
    } catch (error) {
      console.error("미디어 삭제 실패:", error);
      alert("미디어 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetPrimary = async () => {
    if (!currentMedia || isVideoItem(currentMedia)) return;
    if (currentMedia.isPrimary) return; // 이미 대표 이미지인 경우

    setIsSettingPrimary(true);
    try {
      const response = await fetch(`/api/media/images/${currentMedia.id}`, {
        method: "PATCH",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to set primary image");
      }

      await response.json();

      // 성공: state 업데이트 (모든 이미지의 isPrimary를 false로, 현재 이미지만 true로)
      setMediaItemsState((prevItems) =>
        prevItems.map((item) => {
          if (isImageItem(item)) {
            return {
              ...item,
              isPrimary: item.id === currentMedia.id,
            };
          }
          return item;
        })
      );
    } catch (error) {
      console.error("대표 이미지 설정 실패:", error);
      alert("대표 이미지 설정 중 오류가 발생했습니다.");
    } finally {
      setIsSettingPrimary(false);
    }
  };

  // 키보드 이벤트 처리
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          handleClose();
          break;
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentMedia, handleClose, goToPrevious, goToNext]);

  if (!isOpen || !mediaItemsState.length || !currentMedia) return null;

  return (
    <>
      {/* 모달 오버레이 - 최상단, 전체 화면 */}
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center">
        {/* 헤더 */}
        <div className="z-[60] w-full bg-black bg-opacity-50 p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-4">
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="text-sm">
                <div className="font-medium">
                  {isVideoItem(currentMedia) ? "동영상" : "이미지"}
                </div>
                <div className="text-gray-300">
                  {currentIndex + 1} / {mediaItemsState.length}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 대표 이미지로 설정 버튼 - 모든 이미지가 isPrimary 정보를 가지고 있고, 현재 이미지가 대표 이미지가 아닌 경우만 표시 */}
              {showSetPrimaryButton &&
                isImageItem(currentMedia) &&
                !currentMedia.isPrimary && (
                  <Button
                    onClick={handleSetPrimary}
                    disabled={isSettingPrimary || isDeleting}
                    variant="outline"
                    size="sm"
                    className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                  >
                    {isSettingPrimary ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Star className="w-4 h-4 mr-1" />
                        <span className="text-sm">대표 이미지로 설정</span>
                      </>
                    )}
                  </Button>
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
        <div className="relative w-full flex-1 flex-col min-h-0 flex items-center justify-center">
          {isVideoItem(currentMedia) ? (
            // 비디오 표시 - Cloudflare Stream Player 사용
            <div className="w-full flex-1 px-2">
              <CloudflareVideoPlayer
                streamId={currentMedia.streamId}
                controls={true}
                onError={(e) => {
                  console.error("비디오 로드 실패:", e);
                }}
              />
            </div>
          ) : (
            // 이미지 표시
            <div className="relative max-w-full max-h-full">
              <Image
                src={getOptimizedImageUrl(currentMedia.cloudflareId, "public")}
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
          {mediaItemsState.length > 1 && (
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
        {mediaItemsState.length > 1 && (
          <div className="w-full z-[60] bg-black bg-opacity-50 p-4">
            <div className="flex gap-2 justify-center overflow-x-auto max-w-full">
              {mediaItemsState.map((media, index) => (
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
                      unoptimized
                      onError={(e) => {
                        console.error("비디오 썸네일 로드 실패:", e);
                      }}
                    />
                  ) : (
                    <Image
                      src={media.thumbnailUrl}
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
