"use client";

import { getOptimizedImageUrl } from "@/app/lib/utils/media.utils";
import { getCloudflareStreamThumbnailUrl } from "@/app/services/media/media.service";
import { X } from "lucide-react";
import Image from "next/image";
import FullscreenMediaViewer, {
  isImageItem,
  isVideoItem,
  MediaItem,
} from "./FullscreenMediaViewer";
import { useState } from "react";

export interface MediaThumbnailsProps {
  mediaItems: MediaItem[];
  canEdit: boolean;
  mediaMutate?: () => void;
}

export const MediaThumbnails = ({
  mediaItems,
  canEdit,
  mediaMutate,
}: MediaThumbnailsProps) => {
  const [isMediaViewerOpen, setIsMediaViewerOpen] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  const handleMediaClick = (index: number) => {
    setSelectedMediaIndex(index);
    setIsMediaViewerOpen(true);
  };
  const handleMediaDelete = async (id: string, type: "image" | "video") => {
    if (
      !confirm(
        `이 ${type === "image" ? "이미지" : "비디오"}를 삭제하시겠습니까?`
      )
    )
      return;
    // Request
    try {
      const response = await fetch(
        `/api/media/${type === "image" ? "images" : "videos"}/${id}`,
        { method: "DELETE" }
      );
      if (response.ok) {
        alert(
          `${
            type === "image" ? "이미지" : "비디오"
          }가 성공적으로 삭제되었습니다.`
        );

        // 부모 컴포넌트의 데이터 갱신
        mediaMutate?.();
      } else {
        const error = await response.json();
        alert(`삭제 실패: ${error.message || "미디어 삭제에 실패했습니다."}`);
      }
    } catch (error: any) {
      console.error("미디어 삭제 실패:", error);
      alert(`삭제 실패: ${error.message || "미디어 삭제에 실패했습니다."}`);
    }
  };
  const images = mediaItems.filter((media) => isImageItem(media));
  const videos = mediaItems.filter((media) => isVideoItem(media));

  return (
    <div className="space-y-6">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h2 className="card-title">미디어</h2>
            <div className="text-sm font-bold flex items-center gap-4">
              <span>이미지: {images.length || 0}</span>
              <span>
                비디오:
                {videos.length || 0}
              </span>
            </div>
          </div>

          {/* Unified Media Thumbnails (64x64) */}
          {images.length + videos.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {images.length > 0 &&
                images.map((image, index) => (
                  <div key={`img-${image.id}`} className="relative group">
                    <button
                      onClick={() => handleMediaClick(index)}
                      className="block"
                    >
                      <Image
                        src={getOptimizedImageUrl(
                          image.cloudflareId,
                          "thumbnail"
                        )}
                        alt="IMAGE"
                        width={64}
                        height={64}
                        className="w-16 h-16 object-cover rounded-lg hover:opacity-80 transition-opacity"
                      />
                    </button>
                    {/* 대표 이미지 배지 */}
                    {image.isPrimary && (
                      <div className="absolute -top-1 -left-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">
                        대표
                      </div>
                    )}
                    {/* 삭제 버튼 */}
                    {canEdit && (
                      <button
                        onClick={() => handleMediaDelete(image.id, "image")}
                        className="absolute -top-1 -right-1 btn btn-circle btn-xs btn-error opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}

              {videos.length > 0 &&
                videos.map((video, index) => (
                  <div key={`vid-${video.id}`} className="relative group">
                    <button
                      onClick={() =>
                        handleMediaClick((images?.length || 0) + index)
                      }
                      className="block"
                    >
                      <Image
                        src={getCloudflareStreamThumbnailUrl(video.streamId)}
                        alt="비디오 썸네일"
                        width={64}
                        height={64}
                        className="w-16 h-16 object-cover rounded-lg hover:opacity-80 transition-opacity"
                        unoptimized
                        onError={(e) => {
                          console.error("비디오 썸네일 로드 실패:", e);
                        }}
                      />
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => handleMediaDelete(video.id, "video")}
                        className="absolute -top-1 -right-1 btn btn-circle btn-xs btn-error opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
      <FullscreenMediaViewer
        isOpen={isMediaViewerOpen}
        onClose={() => {
          setIsMediaViewerOpen(false);
          // 모달 닫을 때 데이터 갱신
        }}
        mediaItems={mediaItems}
        initialIndex={selectedMediaIndex}
        onDelete={canEdit ? handleMediaDelete : undefined}
      />
    </div>
  );
};
