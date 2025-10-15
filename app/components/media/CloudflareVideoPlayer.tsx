"use client";

import { useEffect, useRef } from "react";

interface CloudflareVideoPlayerProps {
  streamId: string;
  onError?: (error: any) => void;
  controls?: boolean;
}

export default function CloudflareVideoPlayer({
  streamId,
  onError,
  controls = true,
}: CloudflareVideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Stream iframe API를 통한 이벤트 리스닝
    const handleMessage = (event: MessageEvent) => {
      // Cloudflare Stream에서 오는 메시지만 처리
      if (!event.data || typeof event.data !== "object") return;

      const { event: streamEvent, ...data } = event.data;

      switch (streamEvent) {
        case "error":
          console.error("❌ Cloudflare Stream 재생 오류:", data);
          onError?.(data);
          break;
        case "loadedmetadata":
          if (data.videoWidth && data.videoHeight) {
            const width = data.videoWidth;
            const height = data.videoHeight;
            console.log("🎬 비디오 원본 크기:", {
              width,
              height,
              aspectRatio: (width / height).toFixed(2),
              orientation:
                width > height
                  ? "가로 (Landscape)"
                  : width < height
                  ? "세로 (Portrait)"
                  : "정사각형 (Square)",
            });
          }
          break;
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [onError]);

  // Cloudflare Stream 기본 도메인
  const baseUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_DELEVERY_URL!;

  // iframe URL 구성
  const iframeUrl = new URL(`${baseUrl}/${streamId}/iframe`);

  // 컨트롤 설정
  if (!controls) {
    iframeUrl.searchParams.set("controls", "false");
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <iframe
        ref={iframeRef}
        src={iframeUrl.toString()}
        loading="lazy"
        style={{
          border: "none",
          position: "absolute",
          top: 0,
          left: 0,
          height: "100%",
          width: "100%",
        }}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
      />
    </div>
  );
}
