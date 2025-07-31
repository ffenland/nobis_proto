// app/components/media/FullscreenImageViewer.tsx
'use client';

import { useEffect } from 'react';
import { getOptimizedImageUrl } from '@/app/lib/utils/media.utils';

interface FullscreenImageViewerProps {
  imageId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function FullscreenImageViewer({ 
  imageId, 
  isOpen, 
  onClose 
}: FullscreenImageViewerProps) {
  // ESC 키 눌렀을 때 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // 바디 스크롤 방지
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <img
        src={getOptimizedImageUrl(imageId, 'public')}
        alt=""
        className="max-w-full max-h-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}