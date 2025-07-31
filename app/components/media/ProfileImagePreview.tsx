// app/components/media/ProfileImagePreview.tsx
'use client';

import { getOptimizedImageUrl, type ImageVariant } from '@/app/lib/utils/media.utils';

interface ProfileImagePreviewProps {
  imageId?: string | null;
  variant?: ImageVariant;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallback?: React.ReactNode;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-20 h-20',
  xl: 'w-32 h-32',
};

export default function ProfileImagePreview({
  imageId,
  variant = 'avatar',
  size = 'md',
  className = '',
  fallback,
}: ProfileImagePreviewProps) {
  const imageUrl = imageId ? getOptimizedImageUrl(imageId, variant) : null;
  const sizeClass = sizeClasses[size];

  if (!imageUrl) {
    if (fallback) {
      return <>{fallback}</>;
    }

    // 기본 아바타 아이콘
    return (
      <div className={`${sizeClass} ${className} rounded-full bg-base-300 flex items-center justify-center`}>
        <svg
          className="w-1/2 h-1/2 text-base-content/30"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt="프로필 이미지"
      className={`${sizeClass} ${className} rounded-full object-cover`}
    />
  );
}