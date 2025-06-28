// app/trainer/page.tsx
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
import { type ITrainerDashboardStats } from "@/app/lib/services/trainer.service";

// API 호출 함수
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
  })

const TrainerDashboardPage = () => {
  const {
    data: stats,
    error,
    isLoading,
    mutate,
  } = useSWR<ITrainerDashboardStats>("/api/trainer/dashboard-stats", fetcher);

  // 로딩 상태
  if (isLoading) {
    return <LoadingPage message="대시보드 정보를 불러오는 중..." />;
  }

  // 에러 상태
  if (error) {
    return (
      <PageLayout maxWidth="lg">
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

  return (
    <PageLayout maxWidth="lg">
      {/* 헤더 */}
      <PageHeader
        title="트레이너 대시보드"
        subtitle="PT 관리 및 수업 현황을 확인하세요"
      />

      {/* 일정 변경 알림 */}
      <div className="mb-6">
        <ScheduleChangeNotifications maxItems={3} />
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600 mb-1">
              {stats?.pendingCount || 0}
            </div>
            <div className="text-sm text-gray-600">승인 대기</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600 mb-1">
              {stats?.activeCount || 0}
            </div>
            <div className="text-sm text-gray-600">진행 중</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {stats?.todayClasses || 0}
            </div>
            <div className="text-sm text-gray-600">오늘 수업</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {stats?.thisMonthCompleted || 0}
            </div>
            <div className="text-sm text-gray-600">이번 달 완료</div>
          </CardContent>
        </Card>
      </div>

      {/* 승인 대기 알림 */}
      {stats && stats.pendingCount > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-amber-600 text-xl">⏳</div>
                <div>
                  <h3 className="font-medium text-amber-900">
                    승인 대기 중인 PT 신청이 있습니다
                  </h3>
                  <p className="text-sm text-amber-700">
                    {stats.pendingCount}건의 신청이 승인을 기다리고 있습니다.
                  </p>
                </div>
              </div>
              <Link href="/trainer/pending-applications">
                <Button
                  variant="outline"
                  className="border-amber-300 text-amber-700"
                >
                  확인하기
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 간단한 정보 카드 */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">오늘의 현황</h3>
          </div>

          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📊</div>
            <p>오늘 {stats?.todayClasses || 0}개의 수업이 있습니다.</p>
            <p className="text-sm mt-1">
              이번 달 총 {stats?.thisMonthCompleted || 0}개 수업을 완료했습니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 빠른 액션 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl mb-3">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                PT 관리
              </h3>
              <p className="text-gray-600 mb-4">
                진행 중인 PT와 수업 기록을 관리하세요
              </p>
              <Link href="/trainer/pt-list">
                <Button variant="outline" className="w-full">
                  PT 목록 보기
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl mb-3">⏰</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                일정 관리
              </h3>
              <p className="text-gray-600 mb-4">
                수업 일정과 휴무를 관리하세요
              </p>
              <Link href="/trainer/schedule">
                <Button variant="outline" className="w-full">
                  일정 관리
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default TrainerDashboardPage;
