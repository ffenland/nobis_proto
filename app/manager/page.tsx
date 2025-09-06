// app/manager/page.tsx
"use client";

import Link from "next/link";
import useSWR from "swr";
import { PageHeader, PageLayout } from "@/app/components/ui/Dropdown";
import { Card, CardContent, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { formatTime } from "@/app/lib/utils/time.utils";
import UserDropdownMenu from "@/app/components/base/UserDropdownMenu";
import type { 
  GetManagerDashboardPTResult,
  GetManagerDashboardScheduleResult,
  GetManagerDashboardCentersResult
} from "@/app/services/manager/dashboard.service";

// 스켈레톤 로딩 컴포넌트
const StatsSkeleton = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
    {[...Array(4)].map((_, i) => (
      <Card key={i} className="animate-pulse">
        <CardContent className="p-3">
          <div className="text-center">
            <div className="h-3 bg-gray-200 rounded w-16 mx-auto mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-12 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const ScheduleSkeleton = () => (
  <Card className="animate-pulse">
    <CardHeader>
      <div className="h-5 bg-gray-200 rounded w-32"></div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded"></div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const ActivitiesSkeleton = () => (
  <Card className="animate-pulse">
    <CardHeader>
      <div className="h-5 bg-gray-200 rounded w-28"></div>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 bg-gray-200 rounded"></div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const ManagerDashboardPage = () => {
  // 모든 API 동시 요청 - 빠른 로딩
  const { data: ptData, isLoading: ptLoading } = 
    useSWR<GetManagerDashboardPTResult>('/api/manager/dashboard/pt');
  
  const { data: scheduleData } = 
    useSWR<GetManagerDashboardScheduleResult>('/api/manager/dashboard/schedule');
  
  const { data: centersData } = 
    useSWR<GetManagerDashboardCentersResult>('/api/manager/dashboard/centers');

  // PT 데이터 로딩 중일 때는 전체 로딩 화면 표시 (가장 중요한 정보)
  if (ptLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">대시보드 로딩 중...</p>
        </div>
      </div>
    );
  }

  // PT 데이터가 없으면 대기
  if (!ptData) {
    return null;
  }

  return (
    <>
      {/* 반응형 컨테이너 - 태블릿 이상에서 광고 영역 표시 */}
      <div className="lg:flex lg:gap-6">
        {/* 메인 콘텐츠 영역 - 모바일에서 전체 너비, 태블릿 이상에서 제한 */}
        <div className="lg:flex-1 lg:max-w-4xl">
          {/* 헤더 영역 */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <PageHeader
                title="매니저 대시보드"
                subtitle={`${ptData.manager.name} 매니저님`}
              />
            </div>
            <UserDropdownMenu
              username={ptData.manager.name}
              showRoleSwitch={true}  // 매니저는 항상 트레이너로 전환 가능
              targetRole="TRAINER"
            />
          </div>

          {/* PT 통계 카드 - PT 데이터 (가장 중요한 정보) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-3">
                <div className="text-center">
                  <span className="text-emerald-500 text-lg block mb-1">✨</span>
                  <p className="text-xs text-emerald-600 mb-1">신규 등록</p>
                  <p className="text-xl font-bold text-emerald-900">{ptData.ptStats.newPtThisMonth}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3">
                <div className="text-center">
                  <span className="text-blue-500 text-lg block mb-1">🔄</span>
                  <p className="text-xs text-blue-600 mb-1">재등록</p>
                  <p className="text-xl font-bold text-blue-900">{ptData.ptStats.renewedPtThisMonth}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-3">
                <div className="text-center">
                  <span className="text-amber-500 text-lg block mb-1">⏰</span>
                  <p className="text-xs text-amber-600 mb-1">종료 임박</p>
                  <p className="text-xl font-bold text-amber-900">{ptData.ptStats.endingSoonPt}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-3">
                <div className="text-center">
                  <span className="text-gray-500 text-lg block mb-1">📋</span>
                  <p className="text-xs text-gray-600 mb-1">이번달 종료</p>
                  <p className="text-xl font-bold text-gray-900">{ptData.ptStats.endedPtThisMonth}</p>
                </div>
              </CardContent>
            </Card>
          </div>


          {/* 주간 스케줄 및 오늘 레슨 - Schedule 데이터 (후속 로딩) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {!scheduleData ? (
              <>
                <ScheduleSkeleton />
                <ScheduleSkeleton />
              </>
            ) : (
              <>
                {/* 오늘의 레슨 */}
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">오늘의 레슨</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                      <div className="text-center">
                        <p className="text-xs text-gray-600">완료</p>
                        <p className="text-lg font-bold text-green-600">{scheduleData.todayLessons.stats.completed}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600">진행중</p>
                        <p className="text-lg font-bold text-blue-600">{scheduleData.todayLessons.stats.inProgress}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600">예정</p>
                        <p className="text-lg font-bold text-orange-600">{scheduleData.todayLessons.stats.upcoming}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600">결석</p>
                        <p className="text-lg font-bold text-red-600">{scheduleData.todayLessons.stats.absent}</p>
                      </div>
                    </div>
                    
                    {scheduleData.todayLessons.upcoming.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold mb-2 text-gray-700">다음 레슨</h4>
                        <div className="space-y-2">
                          {scheduleData.todayLessons.upcoming.slice(0, 3).map((lesson) => (
                            <div key={lesson.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                              <span>{formatTime(new Date(lesson.time).getHours() * 100 + new Date(lesson.time).getMinutes())}</span>
                              <span className="font-medium">{lesson.memberName}</span>
                              <span className="text-gray-600 truncate max-w-20">{lesson.ptTitle}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 주간 스케줄 */}
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">주간 스케줄</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {scheduleData.weeklySchedule.map((day, index) => (
                        <div 
                          key={index} 
                          className={`flex justify-between items-center p-2 rounded ${
                            day.isToday ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${day.isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                              {day.day} {day.date}일
                            </span>
                            {day.isToday && <Badge variant="info" className="text-xs">오늘</Badge>}
                          </div>
                          <div className="flex gap-2 text-xs">
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded">완료 {day.completed}</span>
                            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">예정 {day.scheduled}</span>
                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded">결석 {day.absent}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* 센터 개요 - Centers 데이터 */}
          <div className="grid grid-cols-1 gap-4">
            {!centersData ? (
              <ActivitiesSkeleton />
            ) : (
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">센터 개요</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {centersData.centerOverview.map((center) => (
                      <div key={center.id} className="border-l-4 border-blue-400 pl-3 py-2 bg-blue-50">
                        <h4 className="font-medium text-blue-900 text-sm">{center.title}</h4>
                        <div className="flex gap-4 mt-1 text-xs text-blue-700">
                          <span>트레이너 {center.trainerCount}명</span>
                          <span>활성 PT {center.activePtCount}개</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link href="/manager/centers">
                    <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white" size="sm">
                      센터 관리
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* 광고 영역 - 데스크탑에서만 표시 */}
        <div className="hidden lg:block lg:w-80">
          <Card className="sticky top-6 bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="font-bold text-lg text-blue-900 mb-2">
                프리미엄 분석 도구
              </h3>
              <p className="text-sm text-blue-700 mb-4">
                더 자세한 통계와 인사이트를 확인하세요
              </p>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                업그레이드
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default ManagerDashboardPage;