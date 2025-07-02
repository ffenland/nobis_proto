"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Users,
  TrendingUp,
  Calendar,
  Target,
  Search,
  Filter,
  MapPin,
  Phone,
  Mail,
  ChevronRight,
} from "lucide-react";

import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Input } from "@/app/components/ui/Input";
import { Button } from "@/app/components/ui/Button";
import { LoadingSpinner, LoadingPage } from "@/app/components/ui/Loading";
import { Badge } from "@/app/components/ui/Loading";
import type {
  ITrainersWithStats,
  IFitnessCenterList,
} from "@/app/lib/services/trainer-management.service";

// 데이터 페처 함수
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("데이터를 불러오는데 실패했습니다");
  }
  return response.json();
};

export default function TrainersPage() {
  const [selectedCenterId, setSelectedCenterId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // API 쿼리 생성
  const queryParams = new URLSearchParams();
  if (selectedCenterId) queryParams.set("centerId", selectedCenterId);
  if (searchQuery) queryParams.set("search", searchQuery);

  // 데이터 페칭
  const {
    data: trainersData,
    error: trainersError,
    isLoading: trainersLoading,
  } = useSWR<{
    trainers: ITrainersWithStats;
    timestamp: string;
  }>(`/api/manager/trainers?${queryParams.toString()}`, fetcher, {
    refreshInterval: 30000, // 30초마다 갱신
  });

  const { data: centersData } = useSWR<{
    centers: IFitnessCenterList;
  }>("/api/manager/fitness-centers", fetcher);

  // 로딩 상태
  if (trainersLoading) {
    return <LoadingPage message="트레이너 정보를 불러오는 중..." />;
  }

  // 에러 상태
  if (trainersError) {
    return (
      <PageLayout maxWidth="lg">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">데이터를 불러오는데 실패했습니다</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            다시 시도
          </Button>
        </div>
      </PageLayout>
    );
  }

  const trainers = trainersData?.trainers || [];
  const centers = centersData?.centers || [];

  // 전체 통계 계산
  const totalStats = trainers.reduce(
    (acc, center) => {
      center.trainers.forEach((trainer) => {
        acc.totalTrainers += 1;
        acc.totalActivePt += trainer.stats.activePtCount;
        acc.totalMembers += trainer.stats.totalMemberCount;
        acc.totalSessions += trainer.stats.thisMonthCompletedSessions;
      });
      return acc;
    },
    { totalTrainers: 0, totalActivePt: 0, totalMembers: 0, totalSessions: 0 }
  );

  return (
    <PageLayout maxWidth="lg">
      <PageHeader
        title="트레이너 관리"
        subtitle="트레이너별 PT 현황과 수업 기록을 모니터링하세요"
      />

      {/* 전체 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">총 트레이너</p>
                <p className="text-xl font-semibold text-gray-900">
                  {totalStats.totalTrainers}명
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">진행 중 PT</p>
                <p className="text-xl font-semibold text-gray-900">
                  {totalStats.totalActivePt}개
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">총 회원</p>
                <p className="text-xl font-semibold text-gray-900">
                  {totalStats.totalMembers}명
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">이번 달 수업</p>
                <p className="text-xl font-semibold text-gray-900">
                  {totalStats.totalSessions}회
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 및 검색 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="트레이너 이름으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="sm:w-auto"
            >
              <Filter className="w-4 h-4 mr-2" />
              필터
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    센터 선택
                  </label>
                  <select
                    value={selectedCenterId}
                    onChange={(e) => setSelectedCenterId(e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500"
                  >
                    <option value="">모든 센터</option>
                    {centers.map((center) => (
                      <option key={center.id} value={center.id}>
                        {center.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 트레이너 목록 (센터별 그룹화) */}
      {trainers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">조건에 맞는 트레이너가 없습니다</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {trainers.map((center) => (
            <div key={center.id}>
              {/* 센터 헤더 */}
              <div className="flex items-center space-x-3 mb-4">
                <MapPin className="w-5 h-5 text-gray-500" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {center.title}
                  </h2>
                  {center.address && (
                    <p className="text-sm text-gray-600">{center.address}</p>
                  )}
                </div>
                <Badge variant="default">{center.trainers.length}명</Badge>
              </div>

              {/* 트레이너 카드 그리드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {center.trainers.map((trainer) => (
                  <Link
                    key={trainer.id}
                    href={`/manager/trainers/${trainer.id}`}
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
            </div>
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
