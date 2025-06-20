// app/components/SWRProvider.tsx
"use client";

import { SWRConfig } from "swr";

const SWRProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <SWRConfig
      value={{
        refreshInterval: 0, // 자동 갱신 비활성화
        revalidateOnFocus: false, // 포커스 시 재검증 비활성화
        revalidateOnReconnect: true, // 재연결 시 재검증
        dedupingInterval: 5000, // 5초 내 중복 요청 제거
        errorRetryCount: 3, // 에러 시 3번까지 재시도
        errorRetryInterval: 1000, // 1초 간격으로 재시도
        // 전역 fetcher 함수 (선택사항)
        fetcher: (url: string) =>
          fetch(url).then((res) => {
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            return res.json();
          }),
      }}
    >
      {children}
    </SWRConfig>
  );
};

export default SWRProvider;
