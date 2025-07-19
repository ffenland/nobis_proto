// app/components/upload/MediaUpload.tsx
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/Tabs";
import ImageUpload, { type UploadedImage, type ImageUploadProps } from "./ImageUpload";
import VideoUpload, { type UploadedVideo, type VideoUploadProps } from "./VideoUpload";

export interface MediaUploadProps {
  // 공통 설정
  category: string;
  ptId?: string;
  ptRecordId?: string;
  recordType?: string;
  autoDeleteDays?: number;
  
  // 활성화할 미디어 타입
  enableImages?: boolean;
  enableVideos?: boolean;
  
  // 개별 설정 (이미지)
  imageProps?: Partial<ImageUploadProps>;
  
  // 개별 설정 (비디오)
  videoProps?: Partial<VideoUploadProps>;
  
  // 공통 콜백
  onMediaUpload?: (media: (UploadedImage | UploadedVideo)[]) => void;
  onError?: (error: string) => void;
  
  // 스타일링
  className?: string;
  disabled?: boolean;
}

const MediaUpload: React.FC<MediaUploadProps> = ({
  category,
  ptId,
  ptRecordId,
  recordType,
  autoDeleteDays,
  enableImages = true,
  enableVideos = true,
  imageProps = {},
  videoProps = {},
  onMediaUpload,
  onError,
  className = "",
  disabled = false,
}) => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);

  // 공통 메타데이터
  const commonMetadata = {
    category,
    ptId,
    ptRecordId,
    recordType,
    autoDeleteDays,
    disabled,
  };

  // 이미지 업로드 완료 처리
  const handleImageUpload = (images: UploadedImage[]) => {
    setUploadedImages(images);
    onMediaUpload?.([...images, ...uploadedVideos]);
  };

  // 비디오 업로드 완료 처리
  const handleVideoUpload = (videos: UploadedVideo[]) => {
    setUploadedVideos(videos);
    onMediaUpload?.([...uploadedImages, ...videos]);
  };

  // 단일 탭인 경우 탭 UI 숨기기
  const showTabs = enableImages && enableVideos;
  const defaultTab = enableImages ? "images" : "videos";

  if (!showTabs) {
    return (
      <div className={className}>
        {enableImages && (
          <ImageUpload
            {...commonMetadata}
            {...imageProps}
            onUploadComplete={handleImageUpload}
            onUploadError={onError}
          />
        )}
        {enableVideos && (
          <VideoUpload
            {...commonMetadata}
            {...videoProps}
            onUploadComplete={handleVideoUpload}
            onUploadError={onError}
          />
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          {enableImages && (
            <TabsTrigger value="images" disabled={disabled}>
              📷 이미지
            </TabsTrigger>
          )}
          {enableVideos && (
            <TabsTrigger value="videos" disabled={disabled}>
              🎥 비디오
            </TabsTrigger>
          )}
        </TabsList>

        {enableImages && (
          <TabsContent value="images" className="mt-4">
            <ImageUpload
              {...commonMetadata}
              {...imageProps}
              onUploadComplete={handleImageUpload}
              onUploadError={onError}
            />
          </TabsContent>
        )}

        {enableVideos && (
          <TabsContent value="videos" className="mt-4">
            <VideoUpload
              {...commonMetadata}
              {...videoProps}
              onUploadComplete={handleVideoUpload}
              onUploadError={onError}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

// 사용 예시들을 위한 프리셋 컴포넌트들
export const PtRecordMediaUpload: React.FC<{
  ptRecordId: string;
  ptId?: string;
  className?: string;
  onUpload?: (media: (UploadedImage | UploadedVideo)[]) => void;
}> = ({ ptRecordId, ptId, className, onUpload }) => (
  <MediaUpload
    category="pt_record"
    ptId={ptId}
    ptRecordId={ptRecordId}
    recordType="exercise"
    autoDeleteDays={180} // 6개월 후 자동 삭제
    enableImages={true}
    enableVideos={true}
    imageProps={{
      maxFiles: 10,
      maxSizeMB: 10,
    }}
    videoProps={{
      maxFiles: 3,
      maxSizeMB: 200,
      maxDurationSeconds: 300, // 5분
    }}
    onMediaUpload={onUpload}
    className={className}
  />
);

export const ProfileImageUpload: React.FC<{
  className?: string;
  onUpload?: (images: UploadedImage[]) => void;
}> = ({ className, onUpload }) => (
  <MediaUpload
    category="profile"
    enableImages={true}
    enableVideos={false}
    imageProps={{
      maxFiles: 1,
      maxSizeMB: 5,
      previewSize: "lg",
      acceptedTypes: ["image/jpeg", "image/png", "image/webp"],
    }}
    onMediaUpload={(media) => onUpload?.(media as UploadedImage[])}
    className={className}
  />
);

export const ExerciseDemoUpload: React.FC<{
  ptId?: string;
  className?: string;
  onUpload?: (videos: UploadedVideo[]) => void;
}> = ({ ptId, className, onUpload }) => (
  <MediaUpload
    category="exercise_demo"
    ptId={ptId}
    recordType="demo"
    enableImages={false}
    enableVideos={true}
    videoProps={{
      maxFiles: 1,
      maxSizeMB: 100,
      maxDurationSeconds: 120, // 2분
      previewSize: "lg",
    }}
    onMediaUpload={(media) => onUpload?.(media as UploadedVideo[])}
    className={className}
  />
);

export default MediaUpload;