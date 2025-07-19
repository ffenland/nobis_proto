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

      {/* PT 현황 카드 */}
      {stats?.pendingPt && (
        <Link href={`/member/pt/${stats.pendingPt.id}`}>
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="text-3xl">⏳</div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      승인 대기 중인 PT
                    </h3>
                    <Badge variant="warning" className="border-orange-600">
                      대기중
                    </Badge>
                  </div>
                  <p className="text-gray-700 mb-2">
                    {stats.pendingPt.ptProduct.title} -{" "}
                    {stats.pendingPt.trainerName}
                  </p>
                  <div className="text-sm text-gray-600">
                    <div>
                      총 {stats.pendingPt.ptProduct.totalCount}회 /{" "}
                      {stats.pendingPt.ptProduct.time}분
                    </div>
                    <div>
                      신청일: {formatDate(new Date(stats.pendingPt.startDate))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {stats?.confirmedPt && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="text-3xl">💪</div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    진행 중인 PT
                  </h3>
                  <Badge variant="success" className="border-green-600">
                    진행중
                  </Badge>
                </div>
                <p className="text-gray-700 mb-3">
                  {stats.confirmedPt.ptProduct.title} -{" "}
                  {stats.confirmedPt.trainerName}
                </p>

                {stats.ptProgress && (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        진행률
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        {stats.ptProgress.completed}/{stats.ptProgress.total}회
                        ({stats.ptProgress.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${stats.ptProgress.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {stats.nextSession && (
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="text-sm font-medium text-gray-700">
                        다음 수업
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>
                        {formatDate(new Date(stats.nextSession.date))}{" "}
                        {formatTime(stats.nextSession.startTime)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {stats.nextSession.ptTitle} -{" "}
                        {stats.nextSession.trainerName}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!stats?.pendingPt && !stats?.confirmedPt && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center py-8 text-gray-600">
              <div className="text-4xl mb-2">💪</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                PT 신청하기
              </h3>
              <p className="mb-4">아직 신청한 PT가 없습니다.</p>
              <Link href="/member/pt/new">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  PT 신청하기
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 통계 정보 */}
      {stats && (stats.totalSessions > 0 || stats.thisMonthSessions > 0) && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {stats.totalSessions}
              </div>
              <div className="text-sm text-gray-600">총 운동 횟수</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {stats.thisMonthSessions}
              </div>
              <div className="text-sm text-gray-600">이번 달 운동</div>
            </CardContent>
          </Card>
        </div>
      )}

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
