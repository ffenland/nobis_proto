"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import useSWR from "swr";
import {
  Users,
  UserCheck,
  Search,
  Filter,
  MapPin,
  Phone,
  Mail,
  ChevronRight,
  Calendar,
  Activity,
  Award,
  UserCog,
} from "lucide-react";
import { getOptimizedImageUrl } from "@/app/lib/utils/media.utils";

import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Input } from "@/app/components/ui/Input";
import { Button } from "@/app/components/ui/Button";
import {
  LoadingPage,
  Badge,
} from "@/app/components/ui/Loading";
import type { IMembersWithStats } from "@/app/lib/services/member-management.service";
import type { IFitnessCenterList } from "@/app/lib/services/trainer-management.service";

// 데이터 페처 함수
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("데이터를 불러오는데 실패했습니다");
  }
  return response.json();
};

// 날짜 포맷팅 함수
const formatDate = (dateString: string | Date) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

export default function MembersPage() {
  const [selectedCenterId, setSelectedCenterId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [ptFilter, setPtFilter] = useState<string>(""); // "", "true", "false"
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // API 쿼리 생성
  const queryParams = new URLSearchParams();
  if (selectedCenterId) queryParams.set("centerId", selectedCenterId);
  if (searchQuery) queryParams.set("search", searchQuery);
  if (ptFilter) queryParams.set("hasPt", ptFilter);

  // 데이터 페칭
  const {
    data: membersData,
    error: membersError,
    isLoading: membersLoading,
  } = useSWR<{
    members: IMembersWithStats;
    timestamp: string;
  }>(`/api/manager/members?${queryParams.toString()}`, fetcher, {
    refreshInterval: 30000, // 30초마다 갱신
  });

  const { data: centersData } = useSWR<{
    centers: IFitnessCenterList;
  }>("/api/manager/fitness-centers", fetcher);

  // 로딩 상태
  if (membersLoading) {
    return <LoadingPage message="회원 정보를 불러오는 중..." />;
  }

  // 에러 상태
  if (membersError) {
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

  const members = membersData?.members || [];
  const centers = centersData?.centers || [];

  // 전체 통계 계산
  const totalStats = members.reduce(
    (acc, center) => {
      center.members.forEach((member) => {
        acc.totalMembers += 1;
        acc.totalMembersWithPt += member.stats.activePtCount > 0 ? 1 : 0;
        acc.totalMembersWithMembership += member.stats.hasActiveMembership
          ? 1
          : 0;
        acc.totalCompletedSessions += member.stats.totalCompletedSessions;
      });
      return acc;
    },
    {
      totalMembers: 0,
      totalMembersWithPt: 0,
      totalMembersWithMembership: 0,
      totalCompletedSessions: 0,
    }
  );

  const overallPtUtilizationRate =
    totalStats.totalMembers > 0
      ? Math.round(
          (totalStats.totalMembersWithPt / totalStats.totalMembers) * 100 * 10
        ) / 10
      : 0;

  // Calculate membership utilization rate for potential future use
  // const membershipUtilizationRate =
  //   totalStats.totalMembers > 0
  //     ? Math.round(
  //         (totalStats.totalMembersWithMembership / totalStats.totalMembers) *
  //           100 *
  //           10
  //       ) / 10
  //     : 0;

  return (
    <PageLayout maxWidth="lg">
      <PageHeader
        title="회원 관리"
        subtitle="회원별 PT 현황과 이용 통계를 모니터링하세요"
      />

      {/* 관리 버튼들 */}
      <div className="flex justify-end gap-2 mb-4">
        <Link href="/manager/role-management">
          <Button variant="outline" className="flex items-center space-x-2">
            <UserCog className="w-4 h-4" />
            <span>역할 관리</span>
          </Button>
        </Link>
        <Link href="/manager/members/direct-registration" className="flex-1 max-w-xs">
          <Button className="w-full">
            기존 수업 등록
          </Button>
        </Link>
      </div>

      {/* 전체 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
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
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">PT 이용 회원</p>
                <p className="text-xl font-semibold text-gray-900">
                  {totalStats.totalMembersWithPt}명
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">PT 이용률</p>
                <p className="text-xl font-semibold text-gray-900">
                  {overallPtUtilizationRate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Activity className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">총 완료 세션</p>
                <p className="text-xl font-semibold text-gray-900">
                  {totalStats.totalCompletedSessions}회
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 및 필터 */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="회원 이름으로 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2"
              >
                <Filter className="w-4 h-4" />
                <span>필터</span>
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    센터
                  </label>
                  <select
                    value={selectedCenterId}
                    onChange={(e) => setSelectedCenterId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">전체 센터</option>
                    {centers.map((center) => (
                      <option key={center.id} value={center.id}>
                        {center.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PT 이용 여부
                  </label>
                  <select
                    value={ptFilter}
                    onChange={(e) => setPtFilter(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">전체</option>
                    <option value="true">PT 이용 중</option>
                    <option value="false">PT 미이용</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedCenterId("");
                      setSearchQuery("");
                      setPtFilter("");
                    }}
                    className="w-full"
                  >
                    필터 초기화
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 센터별 회원 목록 */}
      <div className="space-y-6">
        {members.length === 0 ? (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">조건에 맞는 회원이 없습니다.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          members.map((center) => (
            <Card key={center.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {center.title}
                    </h3>
                    {center.address && (
                      <p className="text-sm text-gray-600 flex items-center mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        {center.address}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {center.stats.totalMembers}명
                    </div>
                    <div className="text-sm text-gray-600">
                      PT 이용률: {center.stats.ptUtilizationRate}%
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600">PT 이용 회원</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {center.stats.membersWithPt}명
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600">멤버십 보유</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {center.stats.membersWithMembership}명
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600">멤버십 이용률</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {center.stats.totalMembers > 0
                        ? Math.round(
                            (center.stats.membersWithMembership /
                              center.stats.totalMembers) *
                              100 *
                              10
                          ) / 10
                        : 0}
                      %
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {center.members.map((member) => (
                    <Link
                      key={member.id}
                      href={`/manager/members/${member.id}`}
                      className="block"
                    >
                      <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all duration-200">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                              {member.user.avatarImage?.cloudflareId ? (
                                <Image
                                  src={getOptimizedImageUrl(member.user.avatarImage.cloudflareId, "avatar")}
                                  alt={member.user.username}
                                  width={48}
                                  height={48}
                                  className="w-full h-full object-cover"
                                  unoptimized={true}
                                />
                              ) : (
                                <Users className="w-6 h-6 text-gray-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-medium text-gray-900">
                                  {member.user.username}
                                </h4>
                                {member.stats.activePtCount > 0 && (
                                  <Badge variant="success">PT 이용 중</Badge>
                                )}
                                {member.stats.hasActiveMembership && (
                                  <Badge variant="default">멤버십</Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 mt-1">
                                <span className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-1" />
                                  가입일: {formatDate(member.user.createdAt)}
                                </span>
                                {member.user.email && (
                                  <span className="flex items-center">
                                    <Mail className="w-4 h-4 mr-1" />
                                    <span className="truncate max-w-[200px]">
                                      {member.user.email}
                                    </span>
                                  </span>
                                )}
                                {member.user.mobile && (
                                  <span className="flex items-center">
                                    <Phone className="w-4 h-4 mr-1" />
                                    {member.user.mobile}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between lg:justify-end space-x-4 lg:space-x-6">
                            <div className="text-center">
                              <div className="text-sm text-gray-600">
                                활성 PT
                              </div>
                              <div className="font-semibold text-gray-900">
                                {member.stats.activePtCount}개
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm text-gray-600">
                                완료 세션
                              </div>
                              <div className="font-semibold text-gray-900">
                                {member.stats.totalCompletedSessions}회
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm text-gray-600">
                                PT 이용률
                              </div>
                              <div className="font-semibold text-gray-900">
                                {member.stats.ptUtilizationRate}%
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 hidden lg:block" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PageLayout>
  );
}
