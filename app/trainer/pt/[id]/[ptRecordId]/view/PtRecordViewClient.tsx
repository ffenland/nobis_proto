// app/trainer/pt/[id]/[ptRecordId]/view/PtRecordViewClient.tsx
'use client';

import { useState } from 'react';
import type { TPtRecordDetail } from '../actions';
import { getOptimizedImageUrl } from '@/app/lib/utils/media.utils';
import { getStreamVideoUrl } from '@/app/lib/utils/cloudflare.config';
import FullscreenImageViewer from '@/app/components/media/FullscreenImageViewer';
import FullscreenVideoPlayer from '@/app/components/media/FullscreenVideoPlayer';
import { ImageIcon, PlayCircle } from 'lucide-react';

interface PtRecordViewClientProps {
  items: TPtRecordDetail['items'];
}

export default function PtRecordViewClient({ items }: PtRecordViewClientProps) {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);

  // 모든 이미지 수집
  const allImages = items.flatMap(item => item.images || []);
  
  // 모든 비디오 수집
  const allVideos = items.flatMap(item => item.videos || []);

  const handleImageClick = (imageId: string) => {
    setSelectedImageId(imageId);
  };

  const handleVideoClick = (streamId: string) => {
    const videoUrl = getStreamVideoUrl(streamId, 'watch');
    setSelectedVideoUrl(videoUrl);
  };

  if (allImages.length === 0 && allVideos.length === 0) {
    return null;
  }

  return (
    <>
      {/* 미디어 섹션 */}
      {(allImages.length > 0 || allVideos.length > 0) && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">첨부된 미디어</h3>
          
          {/* 이미지 갤러리 */}
          {allImages.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                사진 ({allImages.length})
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {allImages.map((image) => (
                  <div
                    key={image.id}
                    className="relative aspect-square cursor-pointer group"
                    onClick={() => handleImageClick(image.cloudflareId)}
                  >
                    <img
                      src={getOptimizedImageUrl(image.cloudflareId, 'thumbnail')}
                      alt={image.originalName}
                      className="w-full h-full object-cover rounded-lg transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 비디오 갤러리 */}
          {allVideos.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                동영상 ({allVideos.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allVideos.map((video) => (
                  <div
                    key={video.id}
                    className="relative bg-gray-100 rounded-lg p-4 cursor-pointer group hover:bg-gray-200 transition-colors"
                    onClick={() => handleVideoClick(video.streamId)}
                  >
                    <div className="flex items-center gap-3">
                      <PlayCircle className="w-8 h-8 text-gray-600 group-hover:text-gray-800" />
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
      )}

      {/* 풀스크린 뷰어 */}
      <FullscreenImageViewer
        imageId={selectedImageId || ''}
        isOpen={!!selectedImageId}
        onClose={() => setSelectedImageId(null)}
      />

      <FullscreenVideoPlayer
        videoUrl={selectedVideoUrl || ''}
        isOpen={!!selectedVideoUrl}
        onClose={() => setSelectedVideoUrl(null)}
      />
    </>
  );
}