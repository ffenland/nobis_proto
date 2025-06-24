// app/hooks/useUnreadCount.ts
"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";

interface IUnreadCountData {
  unreadCount: number;
}

const fetchUnreadCount = async (
  url: string
): Promise<{ success: boolean; data: IUnreadCountData }> => {
  const response = await fetch(url);
  return response.json();
};

export function useUnreadCount() {
  const {
    data: result,
    error,
    mutate,
  } = useSWR("/api/chat/unread-count", fetchUnreadCount, {
    refreshInterval: 30000, // 30초마다 새로고침
    revalidateOnFocus: true, // 포커스 시 새로고침
    revalidateOnReconnect: true, // 재연결 시 새로고침
  });

  const unreadCount = result?.success ? result.data.unreadCount : 0;

  // 실시간 업데이트를 위한 수동 새로고침 함수
  const refreshUnreadCount = () => {
    mutate();
  };

  return {
    unreadCount,
    isLoading: !result && !error,
    error,
    refreshUnreadCount,
  };
}
