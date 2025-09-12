"use client";

import { useRef, useEffect, type MutableRefObject } from "react";
import { Stream, type StreamPlayerApi } from "@cloudflare/stream-react";

interface CloudflareVideoPlayerProps {
  streamId: string;
  autoplay?: boolean;
  muted?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onError?: (error: any) => void;
  controls?: boolean;
}

export default function CloudflareVideoPlayer({
  streamId,
  autoplay = false,
  muted = false,
  onPlay,
  onPause,
  onError,
  controls = true,
}: CloudflareVideoPlayerProps) {
  const streamRef = useRef<StreamPlayerApi | undefined>(undefined);

  useEffect(() => {
    if (!streamRef.current) return;

    const player = streamRef.current;

    // 이벤트 리스너 등록
    const handlePlay = () => onPlay?.();
    const handlePause = () => onPause?.();
    const handleError = (e: any) => {
      console.error("Cloudflare Stream 재생 오류:", e);
      onError?.(e);
    };

    // 이벤트 등록 (Stream 컴포넌트의 이벤트 시스템을 통해)
    if (player.addEventListener) {
      player.addEventListener("play", handlePlay);
      player.addEventListener("pause", handlePause);
      player.addEventListener("error", handleError);
    }

    // 정리 함수
    return () => {
      if (player.removeEventListener) {
        player.removeEventListener("play", handlePlay);
        player.removeEventListener("pause", handlePause);
        player.removeEventListener("error", handleError);
      }
    };
  }, [onPlay, onPause, onError]);

  return (
    <Stream
      responsive={true}
      src={streamId}
      controls={controls}
      autoplay={autoplay}
      muted={muted}
      streamRef={streamRef}
      width="100%"
      height="100%"
      onPlay={onPlay}
      onPause={onPause}
      onError={onError}
    />
  );
}
