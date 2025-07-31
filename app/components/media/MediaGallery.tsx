// app/components/media/MediaGallery.tsx
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { getOptimizedImageUrl, formatFileSize, formatVideoDuration } from '@/app/lib/utils/media.utils';
import { toast } from 'react-hot-toast';
import type { EntityType } from '@/app/lib/utils/media.utils';

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url?: string;
  thumbnailUrl?: string;
  metadata?: {
    uploadedAt?: string;
    size?: number;
    duration?: number;
    [key: string]: any;
  };
}

interface MediaGalleryProps {
  entityType: EntityType;
  entityId?: string;
  onSelect?: (item: MediaItem) => void;
  allowDelete?: boolean;
  className?: string;
}

// fetcher 함수
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('미디어 목록 조회 실패');
  }
  return response.json();
};

// 삭제 mutation 함수
async function deleteMediaMutation(
  url: string,
  { arg }: { arg: { id: string; type: 'image' | 'video' } }
) {
  const endpoint = arg.type === 'image' 
    ? `/api/media/images/${arg.id}` 
    : `/api/media/videos/${arg.id}`;
  
  const response = await fetch(endpoint, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('삭제 실패');
  }
}

export default function MediaGallery({
  entityType,
  entityId,
  onSelect,
  allowDelete = false,
  className = '',
}: MediaGalleryProps) {
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);

  // URL 생성
  const params = new URLSearchParams();
  params.append('entityType', entityType);
  if (entityId) {
    params.append('entityId', entityId);
  }
  const url = `/api/media/list?${params.toString()}`;

  // 미디어 목록 조회
  const { data: items = [], error, isLoading, mutate } = useSWR<MediaItem[]>(
    url,
    fetcher
  );

  // 삭제 뮤테이션
  const { trigger: deleteMedia, isMutating: isDeleting } = useSWRMutation(
    url,
    deleteMediaMutation,
    {
      onSuccess: () => {
        toast.success('삭제되었습니다');
        mutate(); // 목록 새로고침
        setSelectedItem(null);
      },
      onError: () => {
        toast.error('삭제 중 오류가 발생했습니다');
      },
    }
  );

  // 아이템 클릭 핸들러
  const handleItemClick = (item: MediaItem) => {
    setSelectedItem(item);
    onSelect?.(item);
  };

  // 삭제 핸들러
  const handleDelete = (item: MediaItem) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteMedia({ id: item.id, type: item.type });
    }
  };

  if (isLoading) {
    return (
      <div className={`flex justify-center items-center h-64 ${className}`}>
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-base-content/50">미디어가 없습니다</p>
      </div>
    );
  }

  return (
    <>
      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
        {items.map((item) => (
          <div
            key={item.id}
            className={`
              relative group cursor-pointer rounded-lg overflow-hidden
              border-2 transition-all
              ${selectedItem?.id === item.id 
                ? 'border-primary' 
                : 'border-transparent hover:border-base-300'
              }
            `}
            onClick={() => handleItemClick(item)}
          >
            {/* 썸네일 */}
            <div className="aspect-square bg-base-200">
              {item.type === 'image' ? (
                <img
                  src={item.thumbnailUrl || getOptimizedImageUrl(item.id, 'thumbnail')}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="relative w-full h-full">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-base-300">
                      <svg
                        className="w-12 h-12 text-base-content/30"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                      </svg>
                    </div>
                  )}
                  {/* 비디오 아이콘 오버레이 */}
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
              )}
            </div>

            {/* 메타데이터 */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white text-xs">
              {item.metadata?.size && (
                <p>{formatFileSize(item.metadata.size)}</p>
              )}
              {item.metadata?.duration && (
                <p>{formatVideoDuration(item.metadata.duration)}</p>
              )}
            </div>

            {/* 삭제 버튼 */}
            {allowDelete && (
              <button
                className="
                  absolute top-2 right-2 btn btn-circle btn-sm btn-error
                  opacity-0 group-hover:opacity-100 transition-opacity
                "
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item);
                }}
                disabled={isDeleting}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 선택된 아이템 상세 정보 (선택적) */}
      {selectedItem && (
        <div className="mt-4 p-4 bg-base-200 rounded-lg">
          <h3 className="font-medium mb-2">선택된 미디어</h3>
          <div className="text-sm space-y-1">
            <p>ID: {selectedItem.id}</p>
            <p>타입: {selectedItem.type === 'image' ? '이미지' : '비디오'}</p>
            {selectedItem.metadata?.uploadedAt && (
              <p>업로드: {new Date(selectedItem.metadata.uploadedAt).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}