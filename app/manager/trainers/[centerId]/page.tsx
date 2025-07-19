"use client";

import Link from "next/link";
import useSWR from "swr";
import { Users, Mail, ChevronRight, ChevronLeft } from "lucide-react";
import { PageLayout } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { LoadingPage } from "@/app/components/ui/Loading";
import { PageHeaderWithActions } from "@/app/components/ui/PageHeaderWithActions";
import { getCenterWithDetails } from "@/app/lib/services/fitness-center.service";
import { formatTime } from "@/app/lib/utils/time.utils";
import { use } from "react";

// 데이터 페처 함수
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("데이터를 불러오는데 실패했습니다");
  }
  return response.json();
};

// 요일 한글 변환 함수
const getWeekDayKorean = (weekDay: string) => {
  const weekDayMap: Record<string, string> = {
    MON: "월",
    TUE: "화",
    WED: "수",
    THU: "목",
    FRI: "금",
    SAT: "토",
    SUN: "일",
  };
  return weekDayMap[weekDay] || weekDay;
};

type Params = Promise<{ centerId: string }>;

export default function CenterTrainersPage(props: { params: Params }) {
  const params = use(props.params);
  const centerId = params.centerId;

  // 센터 상세 정보 조회
  const {
    data: centerData,
    error: centerError,
    isLoading: centerLoading,
  } = useSWR<{
    success: boolean;
    data: Awaited<ReturnType<typeof getCenterWithDetails>>;
  }>(`/api/centers/${centerId}/working-hours`, fetcher);

  // 트레이너 목록 조회 (기존 트레이너 관리 API 활용)
  const queryParams = new URLSearchParams();
  queryParams.set("centerId", centerId);

  const {
    data: trainersData,
    error: trainersError,
    isLoading: trainersLoading,
  } = useSWR<{
    trainers: Array<{
      id: string;
      title: string;
      address: string;
      trainers: Array<{
        id: string;
        user: {
          id: string;
          username: string;
          email: string;
          avatarMedia?: {
            thumbnailUrl: string;
          };
        };
        stats: {
          activePtCount: number;
          totalMemberCount: number;
          thisMonthCompletedSessions: number;
          completionRate: number;
        };
      }>;
    }>;
    timestamp: string;
  }>(`/api/manager/trainers?${queryParams.toString()}`, fetcher);

  if (centerLoading || trainersLoading) {
    return <LoadingPage message="센터 정보를 불러오는 중..." />;
  }

  if (centerError || trainersError) {
    return (
      <PageLayout maxWidth="md">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">데이터를 불러오는데 실패했습니다</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            다시 시도
          </Button>
        </div>
      </PageLayout>
    );
  }

  const center = centerData?.data;
  const trainers = trainersData?.trainers?.[0]?.trainers || [];

  if (!center) {
    return (
      <PageLayout maxWidth="md">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">센터를 찾을 수 없습니다</p>
          <Link href="/manager/trainers">
            <Button variant="outline">트레이너 관리로 돌아가기</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="md">
      <PageHeaderWithActions
        title={center.title}
        subtitle="센터별 트레이너 관리"
        backHref="/manager/trainers"
        backLabel="트레이너 관리"
      />

      {/* 기본 근무시간 */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">기본 근무시간</h2>
        </CardHeader>
        <CardContent>
          {center.defaultWorkingHours.length === 0 ? (
            <div className="flex flex-col items-center">
              <p className="text-center text-gray-500 italic py-8">
                기본 근무시간이 설정되지 않았습니다
              </p>
              <Link href={`/manager/trainers/${centerId}/working-hours`}>
                <Button>
                  <span>설정하기</span>
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <Link href={`/manager/trainers/${centerId}/working-hours`}>
                <Button>
                  <span>수정하기</span>
                </Button>
              </Link>
              {center.defaultWorkingHours.map((workingHour) => (
                <div
                  key={workingHour.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <span className="font-medium text-gray-900">
                    {getWeekDayKorean(workingHour.dayOfWeek)}요일
                  </span>
                  <span className="text-gray-600">
                    출근 {formatTime(workingHour.openTime)} • 퇴근{" "}
                    {formatTime(workingHour.closeTime)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 트레이너 목록 */}
      {trainers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              이 센터에 소속된 트레이너가 없습니다
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trainers.map((trainer) => (
            <Link
              key={trainer.id}
              href={`/manager/trainers/${centerId}/${trainer.id}`}
              className="block"
            >
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  {/* 트레이너 기본 정보 */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                        {trainer.user.avatarMedia?.thumbnailUrl ? (
                          <img
                            src={trainer.user.avatarMedia.thumbnailUrl}
                            alt={trainer.user.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {trainer.user.username}
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          {trainer.user.email && (
                            <span className="flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {trainer.user.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>

                  {/* 통계 정보 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600 font-medium">
                        진행 중 PT
                      </p>
                      <p className="text-lg font-semibold text-blue-700">
                        {trainer.stats.activePtCount}개
                      </p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-600 font-medium">
                        담당 회원
                      </p>
                      <p className="text-lg font-semibold text-green-700">
                        {trainer.stats.totalMemberCount}명
                      </p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-600 font-medium">
                        이번 달 수업
                      </p>
                      <p className="text-lg font-semibold text-purple-700">
                        {trainer.stats.thisMonthCompletedSessions}회
                      </p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <p className="text-sm text-orange-600 font-medium">
                        완료율
                      </p>
                      <p className="text-lg font-semibold text-orange-700">
                        {trainer.stats.completionRate}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* 새로고침 시간 표시 */}
      {trainersData?.timestamp && (
        <div className="text-center text-sm text-gray-500 mt-6">
          마지막 업데이트:{" "}
          {new Date(trainersData.timestamp).toLocaleString("ko-KR")}
        </div>
      )}
    </PageLayout>
  );
}
