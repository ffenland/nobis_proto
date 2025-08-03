// app/trainer/pt/[id]/[ptRecordId]/view/PtRecordItemMedia.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import type { TPtRecordDetail } from "../actions";
import { getOptimizedImageUrl } from "@/app/lib/utils/media.utils";
import { getStreamVideoUrl } from "@/app/lib/utils/cloudflare.config";
import FullscreenImageViewer from "@/app/components/media/FullscreenImageViewer";
import FullscreenVideoPlayer from "@/app/components/media/FullscreenVideoPlayer";
import { ImageIcon, PlayCircle } from "lucide-react";

interface PtRecordItemMediaProps {
  item: TPtRecordDetail["items"][number];
}

export default function PtRecordItemMedia({ item }: PtRecordItemMediaProps) {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);

  const images = item.images || [];
  const videos = item.videos || [];

  const handleImageClick = (imageId: string) => {
    setSelectedImageId(imageId);
  };

  const handleVideoClick = (streamId: string) => {
    const videoUrl = getStreamVideoUrl(streamId, "watch");
    setSelectedVideoUrl(videoUrl);
  };

  if (images.length === 0 && videos.length === 0) {
    return null;
  }

  return (
    <>
      {/* 미디어 섹션 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        {/* 이미지 갤러리 */}
        {images.length > 0 && (
          <div className="mb-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2">
              첨부 사진 ({images.length})
            </h5>
            <div className="grid grid-cols-3 gap-2">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="relative aspect-square cursor-pointer group"
                  onClick={() => handleImageClick(image.cloudflareId)}
                >
                  <Image
                    src={getOptimizedImageUrl(image.cloudflareId, "avatarSM")}
                    alt={image.originalName}
                    fill={true}
                    className="object-cover rounded-lg transition-transform group-hover:scale-105"
                    unoptimized={true}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 비디오 갤러리 */}
        {videos.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">
              첨부 동영상 ({videos.length})
            </h5>
            <div className="space-y-2">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="bg-gray-50 rounded-lg p-3 cursor-pointer group hover:bg-gray-100 transition-colors"
                  onClick={() => handleVideoClick(video.streamId)}
                >
                  <div className="flex items-center gap-3">
                    <PlayCircle className="w-6 h-6 text-gray-600 group-hover:text-gray-800" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {video.originalName}
                      </p>
                      {video.duration && (
                        <p className="text-xs text-gray-600">
                          {Math.floor(video.duration)}초
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 풀스크린 뷰어 */}
      <FullscreenImageViewer
        imageId={selectedImageId || ""}
        isOpen={!!selectedImageId}
        onClose={() => setSelectedImageId(null)}
      />

      <FullscreenVideoPlayer
        videoUrl={selectedVideoUrl || ""}
        isOpen={!!selectedVideoUrl}
        onClose={() => setSelectedVideoUrl(null)}
      />
    </>
  );
}
