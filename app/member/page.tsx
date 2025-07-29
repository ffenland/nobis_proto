// app/member/page.tsx
"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { LoadingPage, ErrorMessage } from "@/app/components/ui/Loading";
import ClientLogoutButton from "@/app/components/base/c_logout_button";
import { MemberDashboardStats } from "@/app/lib/services/member/member-dashboard.service";
import { formatDateWithConditionalYear } from "@/app/lib/utils/time.utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const MemberDashboardPage = () => {
  const {
    data: stats,
    error,
    isLoading,
    mutate,
  } = useSWR<MemberDashboardStats>("/api/member/dashboard", fetcher, {
    refreshInterval: 5 * 60 * 1000, // 5분마다 자동 새로고침
  });

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

  return (
    <PageLayout maxWidth="md">
      {/* 헤더 영역 - 사용자명과 로그아웃 버튼 */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <PageHeader title="대시보드" subtitle="나의 PT 현황을 확인하세요" />
        </div>
        <ClientLogoutButton userType="member" />
      </div>

      {/* 메인 PT 카드 */}
      <div className="mb-4">
        {/* 진행중인 PT가 있는 경우 */}
        {stats?.confirmedPt && (
          <Link href={`/member/pt/${stats.confirmedPt.id}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="text-3xl mr-4">💪</div>
                  <div className="flex-1">
                    <div className="mb-2">
                      <span className="font-bold text-lg">
                        {stats.confirmedPt.trainerName}
                      </span>
                      <Badge variant="success" className="ml-2">
                        진행중
                      </Badge>
                    </div>
                    {stats.nextSession && (
                      <div className="text-gray-600">
                        <div className="font-medium">
                          {stats.nextSession.sessionNumber}번째 수업 예정일
                        </div>
                        <div className="text-sm">
                          {formatDateWithConditionalYear(
                            stats.nextSession.date
                          )}{" "}
                          {stats.nextSession.startTime}
                        </div>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    클릭하여 상세정보 보기
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* 신청중인 PT가 있는 경우 */}
        {!stats?.confirmedPt && stats?.pendingPt && (
          <Link href={`/member/pt/${stats.pendingPt.id}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="text-3xl mr-4">⏳</div>
                  <div className="flex-1">
                    <div className="mb-2">
                      <span className="font-bold text-lg">
                        {stats.pendingPt.trainerName}
                      </span>
                      <Badge variant="warning" className="ml-2">
                        대기중
                      </Badge>
                    </div>
                    <div className="text-gray-600">
                      <div className="text-sm">
                        트레이너가 아직 확정하지 않았습니다
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex justify-center mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    클릭하여 상세정보 보기
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* PT가 없는 경우 */}
        {!stats?.confirmedPt && !stats?.pendingPt && (
          <Link href="/member/pt/new">
            <Card className="h-40 hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl mb-2">💪</div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    PT 신청하기
                  </h3>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* 일정 변경 요청 알림 */}
      {stats?.pendingScheduleChange && (
        <Link
          href={`/member/pt/${stats.confirmedPt?.id}/${stats.pendingScheduleChange.ptRecordId}/scheduleChange`}
        >
          <Card className="bg-yellow-50 border-yellow-200 hover:bg-yellow-100 transition-colors cursor-pointer">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-yellow-800">
                  일정 변경 요청이 있습니다.
                </span>
                <span className="text-sm text-yellow-600 hover:text-yellow-700">
                  이동하기 →
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}
    </PageLayout>
  );
};

export default MemberDashboardPage;
