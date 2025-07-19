"use client";

import Link from "next/link";
import useSWR from "swr";
import {
  Building2,
  Users,
  Clock,
  ChevronRight,
  MapPin,
  Phone,
  UserCheck,
} from "lucide-react";

import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { LoadingPage } from "@/app/components/ui/Loading";
import { Badge } from "@/app/components/ui/Loading";
import { ICentersWithStats } from "@/app/lib/services/fitness-center.service";
import { formatTime } from "@/app/lib/utils/time.utils";

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

export default function TrainersNavigationPage() {
  // 모든 센터 목록과 통계 조회
  const {
    data: centersData,
    error,
    isLoading,
  } = useSWR<{
    success: boolean;
    data: ICentersWithStats;
  }>("/api/centers", fetcher, {
    refreshInterval: 60000, // 1분마다 갱신
  });

  if (isLoading) {
    return <LoadingPage message="센터 정보를 불러오는 중..." />;
  }

  if (error) {
    return (
      <PageLayout maxWidth="lg">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">데이터를 불러오는데 실패했습니다</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </PageLayout>
    );
  }

  const centers = centersData?.data || [];

  return (
    <PageLayout maxWidth="lg">
      <PageHeader
        title="트레이너 관리"
        subtitle="센터별 트레이너와 근무시간을 관리하세요"
      />

      {/* 센터별 카드 목록 */}
      {centers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">등록된 센터가 없습니다</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {centers.map((center) => (
            <Link
              key={center.id}
              href={`/manager/trainers/${center.id}`}
              className="block"
            >
              <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500 h-full">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {center.title}
                      </h3>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2" />
                          <span className="truncate">{center.address}</span>
                        </div>
                        {center.phone && (
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-2" />
                            <span>{center.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* 트레이너 수 통계 */}
                  <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">
                        소속 트레이너
                      </span>
                    </div>
                    <Badge variant="default" className="bg-blue-600">
                      {center._count.trainers}명
                    </Badge>
                  </div>

                  {/* 기본 근무시간 정보 */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        기본 근무시간
                      </span>
                    </div>

                    {center.defaultWorkingHours.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">
                        기본 근무시간 미설정
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {center.defaultWorkingHours
                          .slice(0, 3) // 최대 3개까지만 표시
                          .map((workingHour) => (
                            <div
                              key={workingHour.id}
                              className="flex items-center justify-between text-xs bg-gray-50 px-2 py-1 rounded"
                            >
                              <span className="font-medium">
                                {getWeekDayKorean(workingHour.dayOfWeek)}요일
                              </span>
                              <span className="text-gray-600">
                                {formatTime(workingHour.openTime)} ~{" "}
                                {formatTime(workingHour.closeTime)}
                              </span>
                            </div>
                          ))}
                        {center.defaultWorkingHours.length > 3 && (
                          <p className="text-xs text-gray-500 text-center">
                            +{center.defaultWorkingHours.length - 3}개 더
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* 추가 안내 */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">
          💡 트레이너 관리 기능
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 센터별 트레이너 목록 및 상세 정보 관리</li>
          <li>• 센터의 기본 근무시간 설정 및 편집</li>
          <li>• 트레이너별 개별 근무시간 조정</li>
          <li>• 트레이너의 센터 이동 관리</li>
        </ul>
      </div>
    </PageLayout>
  );
}
