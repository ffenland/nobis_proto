// app/components/media/ExerciseVideoUpload.tsx
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { 
  validateVideoFile, 
  formatFileSize,
  formatVideoDuration 
} from '@/app/lib/utils/media.utils';
// import { toast } from 'react-hot-toast'; // Commented out as not available
import { X, Video, Upload, Camera, AlertCircle } from 'lucide-react';

interface ExerciseVideoUploadProps {
  maxVideos?: number;
  maxDurationSeconds?: number;
  onChange?: (files: File[]) => void;
  existingVideos?: Array<{
    id: string;
    streamId: string;
    originalName: string;
    size: number;
    duration: number;
    status: string;
  }>;
  onRemoveExisting?: (videoId: string) => void;
  className?: string;
}

interface VideoPreview {
  id: string;
  file: File;
  thumbnailUrl: string;
  duration: number;
  uploading?: boolean;
  error?: string;
}

export default function ExerciseVideoUpload({
  maxVideos = 2,
  maxDurationSeconds = 60,
  onChange,
  existingVideos = [],
  onRemoveExisting,
  className = '',
}: ExerciseVideoUploadProps) {
  const [previews, setPreviews] = useState<VideoPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 비디오 파일에서 썸네일 생성
  const generateThumbnail = async (file: File): Promise<{ thumbnailUrl: string; duration: number }> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.onloadedmetadata = () => {
        // 비디오 중간 지점으로 이동
        video.currentTime = video.duration / 2;
      };

      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx?.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const thumbnailUrl = URL.createObjectURL(blob);
            resolve({ thumbnailUrl, duration: video.duration });
          } else {
            reject(new Error('썸네일 생성 실패'));
          }
          URL.revokeObjectURL(video.src);
        }, 'image/jpeg', 0.7);
      };

      video.onerror = () => {
        reject(new Error('비디오 로드 실패'));
      };

      video.src = URL.createObjectURL(file);
    });
  };

  // 파일 추가 처리
  const handleAddFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // 현재 총 개수 확인
    const currentPreviews = await new Promise<VideoPreview[]>(resolve => {
      setPreviews(prev => {
        resolve(prev);
        return prev;
      });
    });
    
    const currentTotal = currentPreviews.length + existingVideos.length;
    const availableSlots = maxVideos - currentTotal;

    if (availableSlots <= 0) {
      alert(`최대 ${maxVideos}개의 동영상만 업로드할 수 있습니다.`);
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: VideoPreview[] = [];

    for (let i = 0; i < Math.min(fileArray.length, availableSlots); i++) {
      const file = fileArray[i];
      const validation = validateVideoFile(file);
      
      if (!validation.valid) {
        alert(`${file.name}: ${validation.error}`);
        continue;
      }

      try {
        const { thumbnailUrl, duration } = await generateThumbnail(file);
        
        // 시간 제한 확인
        if (duration > maxDurationSeconds) {
          alert(`${file.name}: 최대 ${formatVideoDuration(maxDurationSeconds)}까지만 가능합니다.`);
          URL.revokeObjectURL(thumbnailUrl);
          continue;
        }

        validFiles.push(file);
        newPreviews.push({
          id: `preview-${Date.now()}-${i}`,
          file,
          thumbnailUrl,
          duration,
        });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        alert(`${file.name}: 썸네일 생성 실패`);
      }
    }

    if (validFiles.length > 0) {
      setPreviews(prev => {
        const updatedPreviews = [...prev, ...newPreviews];
        // setTimeout을 사용하여 렌더링 이후에 onChange 호출
        setTimeout(() => {
          onChange?.(updatedPreviews.map(p => p.file));
        }, 0);
        return updatedPreviews;
      });
    }

    if (fileArray.length > availableSlots) {
      alert(`${fileArray.length - availableSlots}개의 파일이 제한을 초과하여 제외되었습니다.`);
    }
  }, [existingVideos.length, maxVideos, maxDurationSeconds, onChange]);

  // 파일 선택 핸들러
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      await handleAddFiles(files);
    }
    // 같은 파일 재선택 가능하도록 초기화
    e.target.value = '';
  };

  // 미리보기 제거
  const handleRemovePreview = (id: string) => {
    setPreviews(prev => {
      const newPreviews = prev.filter(p => {
        if (p.id === id) {
          URL.revokeObjectURL(p.thumbnailUrl);
          return false;
        }
        return true;
      });
      // setTimeout을 사용하여 렌더링 이후에 onChange 호출
      setTimeout(() => {
        onChange?.(newPreviews.map(p => p.file));
      }, 0);
      return newPreviews;
    });
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

  // 컴포넌트 언마운트 시 URL 정리
  useEffect(() => {
    return () => {
      previews.forEach(preview => {
        URL.revokeObjectURL(preview.thumbnailUrl);
      });
    };
  }, [previews]);

  // 전체 비디오 수
  const totalVideos = previews.length + existingVideos.length;
  const canAddMore = totalVideos < maxVideos;

  return (
    <div className={`${className}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-gray-700">
          운동 영상 ({totalVideos}/{maxVideos})
        </label>
        {totalVideos > 0 && (
          <button
            type="button"
            onClick={() => {
              previews.forEach(p => URL.revokeObjectURL(p.thumbnailUrl));
              setPreviews([]);
              onChange?.([]);
            }}
            className="text-xs text-red-600 hover:text-red-700"
          >
            모두 삭제
          </button>
        )}
      </div>

      {/* 1분 제한 경고 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-yellow-800">
          <p className="font-medium">최대 {formatVideoDuration(maxDurationSeconds)} 길이의 영상만 업로드 가능합니다.</p>
          <p>긴 영상은 자동으로 거부됩니다.</p>
        </div>
      </div>

      {/* 비디오 그리드 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* 기존 비디오 */}
        {existingVideos.map((video) => (
          <div key={video.id} className="relative aspect-video group">
            <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center relative overflow-hidden">
              {video.status === 'ready' ? (
                <Image
                  src={`https://customer-${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH}.cloudflarestream.com/${video.streamId}/thumbnails/thumbnail.jpg`}
                  alt={video.originalName}
                  fill
                  className="object-cover"
                  unoptimized={true}
                />
              ) : (
                <div className="flex flex-col items-center">
                  <Video className="w-8 h-8 text-gray-400" />
                  <span className="text-xs text-gray-500 mt-1">처리중...</span>
                </div>
              )}
            </div>
            {onRemoveExisting && (
              <button
                type="button"
                onClick={() => onRemoveExisting(video.id)}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full 
                         opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 
                          text-white text-xs p-2 rounded-b-lg">
              <div className="flex justify-between items-center">
                <span>{formatFileSize(video.size)}</span>
                <span>{formatVideoDuration(video.duration)}</span>
              </div>
            </div>
          </div>
        ))}

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
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 
                          text-white text-xs p-2 rounded-b-lg flex justify-between">
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
              ${isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400 bg-gray-50'
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
        <div className="flex gap-2">
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

      {/* 안내 텍스트 */}
      <p className="text-xs text-gray-500 mt-2">
        MP4, MOV, WebM 형식 • 최대 100MB • 최대 {maxVideos}개 • 최대 {formatVideoDuration(maxDurationSeconds)}
      </p>
    </div>
  );
}