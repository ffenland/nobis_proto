// app/member/page.tsx
"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { LoadingPage, ErrorMessage } from "@/app/components/ui/Loading";
import { formatTime } from "@/app/lib/utils/time.utils";
import { formatDate } from "@/app/lib/utils";
import ScheduleChangeNotifications from "@/app/components/notifications/ScheduleChangeNotifications";
import { type IMemberDashboardStats } from "@/app/lib/services/member.service";
import ClientLogoutButton from "@/app/components/base/c_logout_button";

// API 호출 함수 (타입 추론 사용)
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

const MemberDashboardPage = () => {
  const {
    data: stats,
    error,
    isLoading,
    mutate,
  } = useSWR<IMemberDashboardStats>("/api/member/dashboard", fetcher);

  // 로딩 상태
  if (isLoading) {
    return <LoadingPage message="대시보드 정보를 불러오는 중..." />;
  }

  // 에러 상태
  if (error) {
    return (
      <PageLayout maxWidth="md">
        <ErrorMessage
          message="대시보드 정보를 불러올 수 없습니다."
          action={
            <Button variant="outline" onClick={() => mutate()}>
              다시 시도
            </Button>
          }
        />
      </PageLayout>
    );
  }

  // 간단한 통계만 표시 (실제 서비스 함수 구조에 맞춤)
  return (
    <PageLayout maxWidth="md">
      {/* 헤더 영역 - 사용자명과 로그아웃 버튼 */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <PageHeader title="대시보드" subtitle="나의 PT 현황을 확인하세요" />
        </div>
        <ClientLogoutButton userType="member" />
      </div>

      {/* 일정 변경 알림 */}
      <div className="mb-6">
        <ScheduleChangeNotifications maxItems={3} />
      </div>

      {/* 간단한 현황 카드 */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="text-center py-8 text-gray-600">
            <div className="text-4xl mb-2">💪</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              PT 현황
            </h3>
            <p>대시보드 정보를 준비 중입니다.</p>
            <p className="text-sm mt-1">
              곧 상세한 정보를 확인하실 수 있습니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 빠른 액션 */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl mb-3">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                PT 관리
              </h3>
              <p className="text-gray-600 mb-4">나의 PT 현황을 확인하세요</p>
              <Link href="/member/pt">
                <Button variant="outline" className="w-full">
                  PT 보기
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl mb-3">📅</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                일정 보기
              </h3>
              <p className="text-gray-600 mb-4">예정된 수업을 확인하세요</p>
              <Link href="/member/schedule">
                <Button variant="outline" className="w-full">
                  일정 보기
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default MemberDashboardPage;
