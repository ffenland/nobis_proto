// app/member/page.tsx (새 API 구조 적용)
"use client";

import useSWR from "swr";
import Link from "next/link";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { LoadingPage, ErrorMessage } from "@/app/components/ui/Loading";
import {
  IMemberDashboardStats,
  IMemberPtSummary,
} from "@/app/lib/services/member.service";

// API fetcher
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

const MemberDashboardPage = () => {
  // 대시보드 데이터 조회
  const {
    data: dashboardData,
    error: dashboardError,
    isLoading: dashboardLoading,
  } = useSWR<IMemberDashboardStats>("/api/member/dashboard", fetcher);

  // PT 요약 정보 조회 (새 API 엔드포인트)
  const {
    data: ptSummary,
    error: ptError,
    isLoading: ptLoading,
  } = useSWR<IMemberPtSummary>("/api/member/pt-summary", fetcher);

  // 시간 포맷 함수
  const formatTime = (time: number) => {
    const hour = Math.floor(time / 100);
    const minute = time % 100;
    return `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();

    if (date.toDateString() === today.toDateString()) {
      return "오늘";
    } else if (date > today) {
      return date.toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      });
    } else {
      return date.toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      });
    }
  };

  // PT 상태 결정
  const getPtStatus = (pt: IMemberPtSummary[number]) => {
    if (pt.isPending) {
      return { text: "승인대기", variant: "warning" as const };
    } else if (pt.isCompleted) {
      return { text: "완료", variant: "default" as const };
    } else if (pt.isConfirmed) {
      return { text: "진행중", variant: "success" as const };
    } else {
      return { text: "알 수 없음", variant: "default" as const };
    }
  };

  // 로딩 상태
  if (dashboardLoading) {
    return <LoadingPage message="대시보드를 불러오는 중..." />;
  }

  // 에러 상태
  if (dashboardError) {
    return (
      <PageLayout maxWidth="md">
        <ErrorMessage message="대시보드를 불러올 수 없습니다." />
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="md">
      <PageHeader title={`안녕하세요! 👋`} subtitle="오늘도 화이팅하세요!" />

      {/* 통계 카드들 */}
      {dashboardData && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {dashboardData.activePts}
              </div>
              <div className="text-sm text-gray-600">진행중인 PT</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {dashboardData.totalSessions}
              </div>
              <div className="text-sm text-gray-600">총 운동 횟수</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {dashboardData.pendingPts}
              </div>
              <div className="text-sm text-gray-600">승인 대기</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {dashboardData.thisMonthSessions}
              </div>
              <div className="text-sm text-gray-600">이번 달 운동</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 다음 수업 일정 */}
      {dashboardData?.nextSession && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">다음 수업</h3>
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-blue-900">
                    {dashboardData.nextSession.ptTitle}
                  </div>
                  <div className="text-sm text-blue-700">
                    {dashboardData.nextSession.trainerName} 트레이너
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-blue-900">
                    {formatDate(dashboardData.nextSession.date)}
                  </div>
                  <div className="text-sm text-blue-700">
                    {formatTime(dashboardData.nextSession.startTime)} -
                    {formatTime(dashboardData.nextSession.endTime)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PT 요약 */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">내 PT</h3>
            <Link href="/member/pt">
              <Button variant="outline" size="sm">
                전체 보기
              </Button>
            </Link>
          </div>

          {ptLoading ? (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-500 text-sm mt-2">로딩 중...</p>
            </div>
          ) : ptError ? (
            <ErrorMessage message="PT 정보를 불러올 수 없습니다." />
          ) : !ptSummary || ptSummary.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🏋️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                아직 등록된 PT가 없습니다
              </h3>
              <p className="text-gray-600 mb-4">
                새로운 PT를 신청해서 운동을 시작해보세요!
              </p>
              <Link href="/member/pt/new">
                <Button variant="primary">PT 신청하기</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {ptSummary.map((pt) => {
                const status = getPtStatus(pt);
                return (
                  <Link key={pt.id} href={`/member/pt/${pt.id}`}>
                    <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {pt.ptProduct.title}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <Badge variant={status.variant}>
                              {status.text}
                            </Badge>
                            {pt.isConfirmed && !pt.isCompleted && (
                              <span>
                                {pt.completedCount}/{pt.ptProduct.totalCount}회
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">
                            {pt.trainer?.user.username || "트레이너 배정 대기"}
                          </div>
                          {pt.upcomingSession && (
                            <div className="text-sm text-gray-900 font-medium">
                              {formatDate(pt.upcomingSession.date)}{" "}
                              {formatTime(pt.upcomingSession.startTime)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 액션 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl mb-3">➕</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                새 PT 신청
              </h3>
              <p className="text-gray-600 mb-4">
                새로운 PT 프로그램을 신청하세요
              </p>
              <Link href="/member/pt/new">
                <Button variant="primary" className="w-full">
                  PT 신청하기
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                운동 기록
              </h3>
              <p className="text-gray-600 mb-4">
                내 운동 기록과 진행 상황을 확인하세요
              </p>
              <Link href="/member/records">
                <Button variant="outline" className="w-full">
                  기록 보기
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
