// app/member/pt/[id]/[ptRecordId]/PtRecordDetailClient.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { type TPtRecordDetail } from "./actions";
import FullscreenImageViewer from '@/app/components/media/FullscreenImageViewer';
import FullscreenVideoPlayer from '@/app/components/media/FullscreenVideoPlayer';
import { getOptimizedImageUrl, formatFileSize, formatVideoDuration } from '@/app/lib/utils/media.utils';
import { getStreamVideoUrl } from '@/app/lib/utils/cloudflare.config';

interface PtRecordDetailClientProps {
  ptRecordDetail: TPtRecordDetail;
}

export default function PtRecordDetailClient({ ptRecordDetail }: PtRecordDetailClientProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  
  // 디버깅을 위한 로그
  console.log('ptRecordDetail items:', ptRecordDetail.items.map(item => ({
    id: item.id,
    title: item.title,
    images: item.images,
    videos: item.videos
  })));

  return (
    <>
      {/* 운동별 미디어 갤러리 */}
      <div className="space-y-6">
        {ptRecordDetail.items.map((item, index) => (
          <div key={item.id} className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">
              {index + 1}. {item.title || "운동"}
            </h3>

            {/* 운동 상세 정보 (기존 코드 유지) */}
            {/* 머신 운동 */}
            {item.type === "MACHINE" && item.machineSetRecords.length > 0 && (
              <div className="space-y-2 mb-4">
                <div className="text-sm font-medium text-gray-700">
                  {item.machineSetRecords[0].settingValues[0]?.machineSetting?.machine?.title || "머신"}
                </div>
                {item.machineSetRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded"
                  >
                    <span>{record.set}세트</span>
                    <span className="font-medium">{record.reps}회</span>
                    <span className="text-gray-600">
                      {record.settingValues
                        .map(
                          (sv) =>
                            `${sv.machineSetting.title}: ${sv.value}${sv.machineSetting.unit}`
                        )
                        .join(", ")}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* 프리웨이트 */}
            {item.type === "FREE" && item.freeSetRecords.length > 0 && (
              <div className="space-y-2 mb-4">
                {item.freeSetRecords[0].freeExercise && (
                  <div className="text-sm font-medium text-gray-700">
                    {item.freeSetRecords[0].freeExercise.title}
                  </div>
                )}
                {item.freeSetRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded"
                  >
                    <span>{record.set}세트</span>
                    <span className="font-medium">{record.reps}회</span>
                    <span className="text-gray-600">
                      {record.equipments
                        .map(
                          (eq) =>
                            `${eq.title} ${eq.primaryValue}${eq.primaryUnit}`
                        )
                        .join(", ")}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* 스트레칭 */}
            {item.type === "STRETCHING" && item.stretchingExerciseRecords.length > 0 && (
              <div className="space-y-2 mb-4">
                {item.stretchingExerciseRecords.map((record) => (
                  <div key={record.id} className="text-sm">
                    <div className="font-medium text-gray-700 mb-1">
                      {record.stretchingExercise.title}
                    </div>
                    {record.stretchingExercise.description && (
                      <p className="text-gray-600 text-xs">
                        {record.stretchingExercise.description}
                      </p>
                    )}
                    {record.equipments.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        사용 기구: {record.equipments.map((eq) => eq.title).join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {item.description && (
              <p className="text-sm text-gray-600 mb-4 pt-2 border-t">
                {item.description}
              </p>
            )}

            {/* 미디어 갤러리 */}
            {(item.images?.length > 0 || item.videos?.length > 0) && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-3">첨부 미디어</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {/* 이미지 */}
                  {item.images?.map((image) => (
                    <div
                      key={image.id}
                      className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setSelectedImage(image.cloudflareId)}
                    >
                      <Image
                        src={getOptimizedImageUrl(image.cloudflareId, 'thumbnail')}
                        alt={image.originalName}
                        fill={true}
                        className="w-full h-full object-cover"
                        unoptimized={true}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <p className="text-white text-xs truncate">{image.originalName}</p>
                        <p className="text-white/80 text-xs">{formatFileSize(image.size)}</p>
                      </div>
                    </div>
                  ))}
                  
                  {/* 비디오 */}
                  {item.videos?.map((video) => (
                    <div
                      key={video.id}
                      className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => {
                        const videoUrl = getStreamVideoUrl(video.streamId, 'watch');
                        console.log('Video URL:', videoUrl);
                        setSelectedVideo(videoUrl);
                      }}
                    >
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <div className="text-center">
                          <svg
                            className="w-12 h-12 text-gray-400 mx-auto mb-2"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                          </svg>
                          <p className="text-xs text-gray-600">{formatVideoDuration(video.duration)}</p>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <p className="text-white text-xs truncate">{video.originalName}</p>
                        <p className="text-white/80 text-xs">{formatFileSize(video.size)}</p>
                      </div>
                      {/* 재생 아이콘 오버레이 */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/50 rounded-full p-2">
                          <svg
                            className="w-8 h-8 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 풀스크린 이미지 뷰어 */}
      <FullscreenImageViewer
        imageId={selectedImage || ''}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
      />

      {/* 풀스크린 비디오 플레이어 */}
      <FullscreenVideoPlayer
        videoUrl={selectedVideo || ''}
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </>
  );
}