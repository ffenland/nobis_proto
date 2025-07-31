// Cloudflare 설정 상수
export const CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN = '9hxchzqtlaa7ndyj';

export const getStreamVideoUrl = (streamId: string, format: 'hls' | 'dash' | 'watch' = 'watch') => {
  if (format === 'watch') {
    // 컨트롤과 자동재생을 위한 파라미터 추가
    return `https://customer-${CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN}.cloudflarestream.com/${streamId}/watch?controls=true&autoplay=false&muted=false&preload=auto`;
  }
  // 기존 HLS/DASH 지원도 유지
  const extension = format === 'hls' ? 'm3u8' : 'mpd';
  return `https://customer-${CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN}.cloudflarestream.com/${streamId}/manifest/video.${extension}`;
};

export const getStreamEmbedUrl = (streamId: string) => {
  return `https://customer-${CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN}.cloudflarestream.com/${streamId}/iframe`;
};