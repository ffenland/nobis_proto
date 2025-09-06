// app/components/SWRProvider.tsx
"use client";

import { SWRConfig } from "swr";
import { useRouter } from "next/navigation";

const SWRProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  
  return (
    <SWRConfig
      value={{
        refreshInterval: 0, // 자동 갱신 비활성화
        revalidateOnFocus: false, // 포커스 시 재검증 비활성화
        revalidateOnReconnect: true, // 재연결 시 재검증
        dedupingInterval: 5000, // 5초 내 중복 요청 제거
        errorRetryCount: 3, // 에러 시 3번까지 재시도
        errorRetryInterval: 1000, // 1초 간격으로 재시도
        // 전역 fetcher 함수
        fetcher: (url: string) =>
          fetch(url).then((res) => {
            // 401 Unauthorized 응답 시 로그인 페이지로 리다이렉트
            if (res.status === 401) {
              router.push('/login');
              throw new Error('Unauthorized');
            }
            
            if (!res.ok) {
              const error = new Error(`HTTP ${res.status}: ${res.statusText}`);
              // @ts-ignore - status 속성 추가
              error.status = res.status;
              throw error;
            }
            return res.json();
          }),
        // 401, 404 에러는 재시도하지 않음
        onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
          // Unauthorized 에러는 재시도하지 않음
          if (error.message === 'Unauthorized') return;
          
          // 404 Not Found 에러는 재시도하지 않음
          // @ts-ignore
          if (error.status === 404) return;
          
          // 3번 이상 재시도하지 않음
          if (retryCount >= 3) return;
          
          // 1초 후 재시도
          setTimeout(() => revalidate({ retryCount }), 1000);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
};

export default SWRProvider;
