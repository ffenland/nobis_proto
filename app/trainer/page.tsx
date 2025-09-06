// app/trainer/page.tsx
"use client";

import Link from "next/link";
import useSWR from "swr";
import { PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { formatTime } from "@/app/lib/utils/time.utils";
import UserDropdownMenu from "@/app/components/base/UserDropdownMenu";
import type { GetTrainerDashboardResult } from "@/app/services/trainer/dashboard.service";

const TrainerDashboardPage = () => {
  // SWR로 데이터 페칭 - 타입 명시
  const { data, error, isLoading } = useSWR<GetTrainerDashboardResult>('/api/trainer/dashboard');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-2">데이터를 불러올 수 없습니다.</p>
          <p className="text-gray-600 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <>
      {/* 반응형 컨테이너 - 태블릿 이상에서 광고 영역 표시 */}
      <div className="lg:flex lg:gap-6">
        {/* 메인 콘텐츠 영역 - 모바일에서 전체 너비, 태블릿 이상에서 제한 */}
        <div className="lg:flex-1 lg:max-w-4xl">
          {/* 헤더 영역 */}
          <div className="mb-6">
            <PageHeader
              title="트레이너 대시보드"
              subtitle={`${data.trainer.name} 트레이너님`}
            />
          </div>

          {/* 0. Pending PT 알림 카드 - 승인 대기 중인 PT가 있을 때만 표시 */}
          {data.pendingPtCount > 0 && (
            <Link href="/trainer/pt/pending" className="block mb-6">
              <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full">
                      <span className="text-2xl">🔔</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-orange-900 mb-1">
                        승인 대기 중인 PT 신청
                      </h3>
                      <p className="text-sm text-orange-700">
                        {data.pendingPtCount}개의 새로운 PT 신청이 승인을 기다리고 있습니다
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="warning" className="bg-orange-100 text-orange-800 font-bold">
                        {data.pendingPtCount}
                      </Badge>
                      <span className="text-orange-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* 1. 오늘 PT 카드 - 항상 표시 */}
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                {data.todayPtCard ? (
                  <>
                    <Link href={`/trainer/lesson/${data.todayPtCard.id}`} className="flex-1">
                      <Button className="w-full h-auto py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white">
                        <div className="flex flex-col items-start text-left w-full">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg font-bold">{data.todayPtCard.memberName}</span>
                            <Badge variant="warning" className="bg-yellow-100 text-yellow-800">
                              {data.todayPtCard.timeRemaining.text}
                            </Badge>
                          </div>
                          <div className="text-sm opacity-90">
                            {formatTime(new Date(data.todayPtCard.scheduledAt).getHours() * 100 + new Date(data.todayPtCard.scheduledAt).getMinutes())} • 
                            {data.todayPtCard.duration}분 • 
                            {data.todayPtCard.remainingCount}회 남음
                          </div>
                        </div>
                      </Button>
                    </Link>
                  </>
                ) : (
                  <div className="flex-1 py-4 px-6 text-center">
                    <p className="text-gray-500">오늘 예정된 수업 없음</p>
                  </div>
                )}
                <Link href="/trainer/pt">
                  <Button variant="outline" className="h-full px-4">
                    <span className="text-sm">전체 PT</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>


          {/* 2. 주간 정보 카드 - 5일 기준 (일요일 제외) */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <h3 className="text-lg font-semibold">주간 일정</h3>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.weeklySchedule.map((day) => (
                <div
                  key={`${day.month}-${day.date}`}
                  className={`
                    flex items-center justify-between p-3 rounded-lg border transition-all
                    ${day.isToday 
                      ? 'bg-blue-50 border-blue-400 shadow-sm' 
                      : day.isPast 
                        ? 'bg-gray-50 border-gray-200' 
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[3rem]">
                      <p className={`text-xs font-medium ${day.isToday ? 'text-blue-600' : 'text-gray-600'}`}>
                        {day.day}
                      </p>
                      <p className={`text-xl font-bold ${day.isToday ? 'text-blue-900' : 'text-gray-900'}`}>
                        {day.date}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* 일요일인 경우 특별 처리 */}
                      {day.isSunday && day.isToday ? (
                        <span className="text-sm text-blue-600 font-medium">일요일</span>
                      ) : (
                      <>
                      {/* 과거의 경우 */}
                      {day.isPast && (
                        <>
                          {day.counts.completed > 0 && (
                            <Badge variant="success" className="text-xs">
                              완료 {day.counts.completed}
                            </Badge>
                          )}
                          {day.counts.absent > 0 && (
                            <Badge variant="error" className="text-xs">
                              불참 {day.counts.absent}
                            </Badge>
                          )}
                          {day.counts.cancelled > 0 && (
                            <Badge variant="default" className="text-xs bg-gray-200 text-gray-700">
                              취소 {day.counts.cancelled}
                            </Badge>
                          )}
                          {day.counts.completed === 0 && day.counts.absent === 0 && day.counts.cancelled === 0 && (
                            <span className="text-sm text-gray-500">수업 없음</span>
                          )}
                        </>
                      )}
                      
                      {/* 오늘의 경우 */}
                      {day.isToday && (
                        <>
                          {day.counts.scheduled > 0 && (
                            <Badge variant="info" className="text-xs">
                              예정 {day.counts.scheduled}
                            </Badge>
                          )}
                          {day.counts.completed > 0 && (
                            <Badge variant="success" className="text-xs">
                              완료 {day.counts.completed}
                            </Badge>
                          )}
                          {day.counts.absent > 0 && (
                            <Badge variant="error" className="text-xs">
                              불참 {day.counts.absent}
                            </Badge>
                          )}
                          {day.counts.cancelled > 0 && (
                            <Badge variant="default" className="text-xs bg-gray-200 text-gray-700">
                              취소 {day.counts.cancelled}
                            </Badge>
                          )}
                          {day.counts.scheduled === 0 && day.counts.completed === 0 && 
                           day.counts.absent === 0 && day.counts.cancelled === 0 && (
                            <span className="text-sm text-gray-500">수업 없음</span>
                          )}
                        </>
                      )}
                      
                      {/* 미래의 경우 */}
                      {day.isFuture && (
                        <>
                          {day.counts.scheduled > 0 && (
                            <Badge variant="default" className="text-xs">
                              예정 {day.counts.scheduled}
                            </Badge>
                          )}
                          {day.counts.cancelled > 0 && (
                            <Badge variant="default" className="text-xs bg-gray-200 text-gray-700">
                              취소 {day.counts.cancelled}
                            </Badge>
                          )}
                          {day.counts.scheduled === 0 && day.counts.cancelled === 0 && (
                            <span className="text-sm text-gray-500">수업 없음</span>
                          )}
                        </>
                      )}
                      </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 3. PT 현황 카드 */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <h3 className="text-lg font-semibold">PT 현황</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-900">{data.ptStatus.active}</p>
                  <p className="text-xs text-blue-600 mt-1">진행중</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-900">{data.ptStatus.newRegistration}</p>
                  <p className="text-xs text-green-600 mt-1">신규등록</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-purple-900">{data.ptStatus.reRegistration}</p>
                  <p className="text-xs text-purple-600 mt-1">재등록</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-amber-900">{data.ptStatus.closingSoon}</p>
                  <p className="text-xs text-amber-600 mt-1">종료임박</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 광고 영역 - 태블릿 이상에서만 표시 */}
        <div className="hidden lg:block lg:w-80">
          <div className="sticky top-4 space-y-4">
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <CardContent className="p-6">
                <div className="text-center">
                  <span className="text-4xl mb-3 block">🎯</span>
                  <h3 className="text-lg font-bold text-purple-900 mb-2">
                    PT 매출 분석
                  </h3>
                  <p className="text-sm text-purple-700 mb-4">
                    이번 달 매출 현황과 트렌드를 확인하세요
                  </p>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                    분석 보기
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <CardContent className="p-6">
                <div className="text-center">
                  <span className="text-4xl mb-3 block">📚</span>
                  <h3 className="text-lg font-bold text-blue-900 mb-2">
                    운동 라이브러리
                  </h3>
                  <p className="text-sm text-blue-700 mb-4">
                    새로운 운동법과 트레이닝 팁을 확인하세요
                  </p>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    둘러보기
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-6">
                <div className="text-center">
                  <span className="text-4xl mb-3 block">💪</span>
                  <h3 className="text-lg font-bold text-green-900 mb-2">
                    회원 관리 TIP
                  </h3>
                  <p className="text-sm text-green-700 mb-4">
                    효과적인 회원 관리 노하우를 공유합니다
                  </p>
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                    자세히 보기
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default TrainerDashboardPage;
