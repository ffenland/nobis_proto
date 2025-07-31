// app/components/media/FullscreenVideoPlayer.tsx
'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface FullscreenVideoPlayerProps {
  videoUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function FullscreenVideoPlayer({ 
  videoUrl, 
  isOpen, 
  onClose 
}: FullscreenVideoPlayerProps) {
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
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* 헤더 영역 */}
      <div className="absolute top-0 right-0 z-10 p-4">
        <button
          onClick={onClose}
          className="btn btn-circle btn-ghost text-white hover:bg-white/20"
          aria-label="닫기"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* 비디오 iframe 영역 */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative w-full h-full max-w-6xl max-h-[90vh] flex items-center justify-center">
          <iframe
            src={videoUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen={true}
            style={{
              border: 'none',
              borderRadius: '8px',
              maxWidth: '100%',
              maxHeight: '100%',
            }}
            title="Cloudflare Stream Player"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-popups-to-escape-sandbox"
          />
        </div>
      </div>
    </div>
  );
}