"use client";

import { getVideoMetadata } from "@/app/lib/utils/media.utils";
import { Plus, Video, X } from "lucide-react";
import Image from "next/image";
import type { Dispatch, SetStateAction } from "react";

export interface ISelectedMedia {
  images: { file: File; preview: string; isPrimary: boolean }[];
  videos: { file: File; preview: string }[];
}

export interface MediaSelectorProps {
  isUploading: boolean;
  selectedMedia: ISelectedMedia;
  setSelectedMedia: Dispatch<SetStateAction<ISelectedMedia>>;
  maxImageCount: number;
  maxVideoCount: number;
  enableImages?: boolean;
  enableVideos?: boolean;
}

export const MediaSelector = ({
  isUploading,
  selectedMedia,
  setSelectedMedia,
  maxImageCount,
  maxVideoCount,
  enableImages = true,
  enableVideos = true,
}: MediaSelectorProps) => {
  // Handle adding image to selected files (preview only)
  const handleAddImage = (file: File) => {
    const currentCount = selectedMedia.images.length;

    if (currentCount >= maxImageCount) {
      alert(`최대 ${maxImageCount}개까지만 이미지를 추가할 수 있습니다.`);
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);

    // Add to selected files
    // 첫 번째 이미지는 자동으로 대표 이미지로 설정
    setSelectedMedia((prev) => {
      const newImages = [
        ...prev.images,
        {
          file,
          preview: previewUrl,
          isPrimary: prev.images.length === 0, // 첫 이미지면 true
        },
      ];
      return { ...prev, images: newImages };
    });
  };
  // Remove selected image
  const handleRemoveImage = (index: number) => {
    const imageToRemove = selectedMedia.images[index];

    // Revoke preview URL to free memory
    URL.revokeObjectURL(imageToRemove.preview);

    setSelectedMedia((prev) => {
      let newImages = prev.images.filter((_, i) => i !== index);

      // 대표 이미지를 삭제한 경우, 남은 이미지 중 첫 번째를 대표로 설정
      if (imageToRemove.isPrimary && newImages.length > 0) {
        newImages = newImages.map((item, i) => ({
          ...item,
          isPrimary: i === 0,
        }));
      }

      return { ...prev, images: newImages };
    });
  };
  // Toggle primary image
  const handleTogglePrimary = (index: number) => {
    setSelectedMedia((prev) => {
      const newImages = prev.images.map((item, i) => ({
        ...item,
        isPrimary: i === index,
      }));
      return { ...prev, images: newImages };
    });
  };

  // Handle adding video to selected videos
  const handleAddVideo = async (file: File) => {
    const currentCount = selectedMedia.videos.length;

    if (currentCount >= maxVideoCount) {
      alert(`최대 ${maxVideoCount}개까지만 비디오를 추가할 수 있습니다.`);
      return;
    }

    try {
      // 비디오 메타데이터 추출 (썸네일 생성)
      const { thumbnailUrl } = await getVideoMetadata(file);

      // Add to selected videos
      setSelectedMedia((prev) => ({
        ...prev,
        videos: [...prev.videos, { file, preview: thumbnailUrl }],
      }));
    } catch (error) {
      console.error("비디오 처리 실패:", error);
      alert("비디오 파일을 처리하는 중 오류가 발생했습니다.");
    }
  };

  // Remove selected video
  const handleRemoveVideo = (index: number) => {
    setSelectedMedia((prev) => {
      const newVideoList = prev.videos.filter((_, i) => i != index);
      return { ...prev, videos: newVideoList };
    });
  };

  return (
    <div>
      {/* 이미지 선택 */}
      {enableImages && (
        <div className="form-control">
        <div className="flex items-center justify-between mb-2">
          <label className="label">
            <span className="label-text">
              이미지 ({selectedMedia.images.length}/{maxImageCount})
            </span>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Selected images (preview only) */}
          {selectedMedia.images.map((imageFile, index) => (
            <div key={`selected-${index}`} className="relative">
              <Image
                src={imageFile.preview}
                alt="Selected image"
                width={128}
                height={128}
                className="w-full h-32 object-cover rounded-lg border-2 border-gray-300"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                disabled={isUploading}
                className="absolute top-2 right-2 btn btn-circle btn-xs btn-error"
              >
                <X className="w-3 h-3" />
              </button>
              {/* 대표 이미지 표시 */}
              <div className="absolute top-2 left-2">
                {imageFile.isPrimary ? (
                  <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded font-semibold">
                    대표
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleTogglePrimary(index)}
                    disabled={isUploading}
                    className="bg-black bg-opacity-60 hover:bg-opacity-80 text-white text-xs px-2 py-1 rounded transition-all"
                  >
                    대표이미지로 설정
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add new image button */}
          {selectedMedia.images.length < 3 && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg h-32">
              <label className="cursor-pointer w-full h-full flex items-center justify-center">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    files.forEach((file) => handleAddImage(file));
                    // Reset input
                    e.target.value = "";
                  }}
                  disabled={isUploading}
                />
                <div className="text-center">
                  <Plus className="w-8 h-8 mx-auto text-gray-400" />
                  <span className="text-sm text-gray-500">이미지 추가</span>
                </div>
              </label>
            </div>
          )}
        </div>
      </div>
      )}

      {/* 비디오 선택 */}
      {enableVideos && (
        <div className="form-control">
        <div className="flex items-center justify-between mb-2">
          <label className="label">
            <span className="label-text">
              비디오 ({selectedMedia.videos.length}/{maxVideoCount})
            </span>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Selected videos */}
          {selectedMedia.videos.map((video, index) => (
            <div key={`selected-video-${index}`} className="relative">
              <Image
                src={video.preview}
                alt="Video thumbnail"
                width={128}
                height={128}
                className="w-full h-32 object-cover rounded-lg border-2 border-gray-300"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black bg-opacity-50 rounded-full p-2">
                  <Video className="w-6 h-6 text-white" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveVideo(index)}
                disabled={isUploading}
                className="absolute top-2 right-2 btn btn-circle btn-xs btn-error"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute bottom-1 left-1 right-1">
                <div className="bg-gray-500 bg-opacity-90 text-white text-xs px-2 py-1 rounded text-center">
                  {video.file.name}
                </div>
              </div>
            </div>
          ))}

          {/* Add new video button */}
          {selectedMedia.videos.length < maxVideoCount && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg h-32">
              <label className="cursor-pointer w-full h-full flex items-center justify-center">
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    files.forEach((file) => handleAddVideo(file));
                    // Reset input
                    e.target.value = "";
                  }}
                  disabled={isUploading}
                />
                <div className="text-center">
                  <Video className="w-8 h-8 mx-auto text-gray-400" />
                  <span className="text-sm text-gray-500">비디오 추가</span>
                </div>
              </label>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
