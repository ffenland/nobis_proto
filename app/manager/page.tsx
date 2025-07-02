// app/manager/page.tsx
import { Card, CardContent, CardHeader } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Loading";
import Link from "next/link";
import {
  getManagerDashboardStats,
  getCenterOverviewStats,
  getRecentActivities,
} from "./actions";
import { PageHeader, PageLayout } from "../components/ui/Dropdown";

const ManagerMainPage = async () => {
  try {
    // 병렬로 데이터 조회
    const [dashboardStats, centerOverviews, recentActivities] =
      await Promise.all([
        getManagerDashboardStats(),
        getCenterOverviewStats(),
        getRecentActivities(),
      ]);

    return (
      <PageLayout maxWidth="xl">
        <PageHeader
          title="매니저 대시보드"
          subtitle="헬스장 운영 현황을 한눈에 확인하세요"
        />

        {/* 주요 지표 카드들 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">총 센터</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardStats.totalCenters}개
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">총 트레이너</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardStats.totalTrainers}명
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">총 회원</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardStats.totalMembers}명
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">활성 PT</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardStats.totalActivePt}건
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <svg
                    className="w-6 h-6 text-orange-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 이번 달 활동 및 7일간 세션 통계 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 이번 달 활동 */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">
                이번 달 활동
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">완료된 세션</p>
                  <p className="text-xl font-bold text-gray-900">
                    {dashboardStats.thisMonthCompletedSessions}회
                  </p>
                </div>
                <div className="text-green-600">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">활성 멤버십</p>
                  <p className="text-xl font-bold text-gray-900">
                    {dashboardStats.activeMemberships}개
                  </p>
                </div>
                <div className="text-blue-600">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 9a2 2 0 10-4 0v5a2 2 0 01-2 2h6m-6-4h4m8 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">총 장비</p>
                  <p className="text-xl font-bold text-gray-900">
                    {dashboardStats.totalMachines}개
                  </p>
                </div>
                <div className="text-gray-600">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                    />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 최근 7일간 세션 추이 */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">
                최근 7일 세션 추이
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardStats.dailySessions.map((day, index) => {
                  const maxSessions = Math.max(
                    ...dashboardStats.dailySessions.map((d) => d.count)
                  );
                  const percentage =
                    maxSessions > 0 ? (day.count / maxSessions) * 100 : 0;
                  const date = new Date(day.date);
                  const dayName = date.toLocaleDateString("ko-KR", {
                    weekday: "short",
                  });
                  const dateString = date.toLocaleDateString("ko-KR", {
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <div key={day.date} className="flex items-center space-x-3">
                      <div className="w-16 text-xs text-gray-500">
                        {dayName} {dateString}
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="w-8 text-sm font-medium text-gray-900">
                        {day.count}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 센터별 개요 */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                센터별 현황
              </h3>
              <Link
                href="/manager/centers"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                전체 보기 →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {centerOverviews.map((center) => (
                <div
                  key={center.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {center.title}
                      </h4>
                      <p className="text-sm text-gray-600">{center.address}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={center.inOperation ? "success" : "error"}>
                        {center.inOperation ? "운영중" : "중단"}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">트레이너</p>
                      <p className="font-semibold">
                        {center.stats.trainerCount}명
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">회원</p>
                      <p className="font-semibold">
                        {center.stats.memberCount}명
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">활성 PT</p>
                      <p className="font-semibold">
                        {center.stats.activePtCount}건
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">활성 멤버십</p>
                      <p className="font-semibold">
                        {center.stats.activeMembershipCount}개
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">장비</p>
                      <p className="font-semibold">
                        {center.stats.machineCount}개
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {centerOverviews.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  등록된 센터가 없습니다.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 최근 활동 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 승인 대기 PT */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  승인 대기 PT
                </h3>
                <Badge variant="warning">
                  {recentActivities.pendingPtRequests.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivities.pendingPtRequests.slice(0, 5).map((pt) => (
                  <div
                    key={pt.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {pt.member?.user.username}
                      </p>
                      <p className="text-xs text-gray-500">
                        {pt.ptProduct.title}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(pt.createdAt).toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                ))}

                {recentActivities.pendingPtRequests.length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    승인 대기중인 PT가 없습니다.
                  </div>
                )}

                {recentActivities.pendingPtRequests.length > 5 && (
                  <div className="pt-2">
                    <Link
                      href="/manager/pt-requests"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      더 보기 ({recentActivities.pendingPtRequests.length - 5}
                      개)
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 신규 회원 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  신규 회원
                </h3>
                <Badge variant="success">
                  {recentActivities.recentMembers.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivities.recentMembers.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {member.user.username}
                      </p>
                      <p className="text-xs text-gray-500">
                        {member.fitnessCenter?.title || "센터 미배정"}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(member.createdAt).toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                ))}

                {recentActivities.recentMembers.length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    최근 가입한 회원이 없습니다.
                  </div>
                )}

                {recentActivities.recentMembers.length > 5 && (
                  <div className="pt-2">
                    <Link
                      href="/manager/members"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      더 보기 ({recentActivities.recentMembers.length - 5}명)
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 최근 완료 세션 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  최근 완료 세션
                </h3>
                <Badge variant="default">
                  {recentActivities.recentCompletedSessions.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivities.recentCompletedSessions
                  .slice(0, 5)
                  .map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {session.pt.member?.user.username}
                        </p>
                        <p className="text-xs text-gray-500">
                          트레이너: {session.pt.trainer?.user.username}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(session.ptSchedule.date).toLocaleDateString(
                          "ko-KR",
                          {
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </div>
                    </div>
                  ))}

                {recentActivities.recentCompletedSessions.length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    최근 완료된 세션이 없습니다.
                  </div>
                )}

                {recentActivities.recentCompletedSessions.length > 5 && (
                  <div className="pt-2">
                    <Link
                      href="/manager/sessions"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      더 보기 (
                      {recentActivities.recentCompletedSessions.length - 5}건)
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 빠른 액션 버튼들 */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">빠른 작업</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                  href="/manager/centers"
                  className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="p-3 bg-blue-100 rounded-lg mb-3">
                    <svg
                      className="w-6 h-6 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    센터 관리
                  </span>
                </Link>

                <Link
                  href="/manager/trainers"
                  className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="p-3 bg-green-100 rounded-lg mb-3">
                    <svg
                      className="w-6 h-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    트레이너 관리
                  </span>
                </Link>

                <Link
                  href="/manager/members"
                  className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="p-3 bg-purple-100 rounded-lg mb-3">
                    <svg
                      className="w-6 h-6 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    회원 관리
                  </span>
                </Link>

                <Link
                  href="/manager/product"
                  className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="p-3 bg-orange-100 rounded-lg mb-3">
                    <svg
                      className="w-6 h-6 text-orange-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    상품 관리
                  </span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  } catch (error) {
    console.error("Manager dashboard error:", error);

    return (
      <PageLayout maxWidth="xl">
        <PageHeader
          title="매니저 대시보드"
          subtitle="헬스장 운영 현황을 한눈에 확인하세요"
        />

        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-red-600 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              데이터를 불러올 수 없습니다
            </h3>
            <p className="text-gray-600 mb-4">
              {error instanceof Error
                ? error.message
                : "알 수 없는 오류가 발생했습니다."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              다시 시도
            </button>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }
};

export default ManagerMainPage;
