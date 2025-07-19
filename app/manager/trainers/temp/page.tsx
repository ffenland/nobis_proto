"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import {
  ArrowLeft,
  Users,
  Calendar,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Eye,
  MapPin,
  Mail,
  Phone,
  Award,
  TrendingUp,
} from "lucide-react";

import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import {
  LoadingSpinner,
  LoadingPage,
  Badge,
} from "@/app/components/ui/Loading";
import type {
  ITrainerDetail,
  ITrainerPtList,
  ITrainerPtItem,
} from "@/app/lib/services/trainer-management.service";

// 데이터 페처 함수
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("데이터를 불러오는데 실패했습니다");
  }
  return response.json();
};

// PT 상태별 스타일 함수
const getPtStatusConfig = (state: string, trainerConfirmed: boolean) => {
  if (state === "CONFIRMED" && trainerConfirmed) {
    return {
      variant: "default" as const,
      text: "진행 중",
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      icon: CheckCircle,
    };
  } else if (state === "CONFIRMED" && !trainerConfirmed) {
    return {
      variant: "default" as const,
      text: "승인 대기",
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-700",
      icon: AlertCircle,
    };
  } else if (state === "PENDING") {
    return {
      variant: "default" as const,
      text: "검토 중",
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      icon: Clock,
    };
  } else if (state === "REJECTED") {
    return {
      variant: "default" as const,
      text: "거절됨",
      bgColor: "bg-red-50",
      textColor: "text-red-700",
      icon: XCircle,
    };
  } else {
    return {
      variant: "default" as const,
      text: "알 수 없음",
      bgColor: "bg-gray-50",
      textColor: "text-gray-700",
      icon: AlertCircle,
    };
  }
};

// 날짜 포맷팅 함수 수정 - Date | string 타입 모두 처리
const formatDate = (date: Date | string) => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatDateTime = (date: Date | string) => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

type Params = Promise<{ trainerId: string }>;

export default function TrainerDetailPage(props: { params: Params }) {
  const params = use(props.params);
  const { trainerId } = params;

  const [stateFilter, setStateFilter] = useState<
    "ALL" | "PENDING" | "CONFIRMED" | "REJECTED"
  >("ALL");
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // API 쿼리 생성
  const ptQueryParams = new URLSearchParams();
  if (stateFilter !== "ALL") ptQueryParams.set("state", stateFilter);

  // 데이터 페칭
  const {
    data: trainerData,
    error: trainerError,
    isLoading: trainerLoading,
  } = useSWR<{
    trainer: ITrainerDetail;
    timestamp?: string;
  }>(`/api/manager/trainers/${trainerId}`, fetcher);

  const {
    data: ptData,
    error: ptError,
    isLoading: ptLoading,
  } = useSWR<{
    ptList: ITrainerPtList;
    timestamp?: string;
  }>(
    `/api/manager/trainers/${trainerId}/pt?${ptQueryParams.toString()}`,
    fetcher,
    {
      refreshInterval: 30000, // 30초마다 갱신
    }
  );

  // 로딩 상태
  if (trainerLoading) {
    return <LoadingPage message="트레이너 정보를 불러오는 중..." />;
  }

  // 에러 상태
  if (trainerError) {
    return (
      <PageLayout maxWidth="lg">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">
            트레이너 정보를 불러오는데 실패했습니다
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            다시 시도
          </Button>
        </div>
      </PageLayout>
    );
  }

  const trainer = trainerData?.trainer;
  const ptList = ptData?.ptList || [];

  if (!trainer) {
    return (
      <PageLayout maxWidth="lg">
        <div className="text-center py-12">
          <p className="text-gray-500">트레이너를 찾을 수 없습니다</p>
          <Link href="/manager/trainers">
            <Button variant="outline" className="mt-4">
              목록으로 돌아가기
            </Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  // PT 통계 계산
  const ptStats = {
    total: ptList.length,
    confirmed: ptList.filter(
      (pt) => pt.state === "CONFIRMED" && pt.trainerConfirmed
    ).length,
    pending: ptList.filter(
      (pt) =>
        pt.state === "PENDING" ||
        (pt.state === "CONFIRMED" && !pt.trainerConfirmed)
    ).length,
    rejected: ptList.filter((pt) => pt.state === "REJECTED").length,
    totalSessions: ptList.reduce((sum, pt) => sum + pt.stats.totalSessions, 0),
    completedSessions: ptList.reduce(
      (sum, pt) => sum + pt.stats.completedSessions,
      0
    ),
  };

  const overallCompletionRate =
    ptStats.totalSessions > 0
      ? Math.round(
          (ptStats.completedSessions / ptStats.totalSessions) * 100 * 10
        ) / 10
      : 0;

  return (
    <PageLayout maxWidth="lg">
      {/* 뒤로가기 버튼을 별도로 배치 */}
      <div className="mb-4">
        <Link href="/manager/trainers">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로 돌아가기
          </Button>
        </Link>
      </div>

      <PageHeader
        title={`${trainer.user.username} 트레이너`}
        subtitle="트레이너 상세 정보 및 PT 관리"
      />

      <div className="space-y-6">
        {/* 트레이너 기본 정보 */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">기본 정보</h2>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
              {/* 프로필 이미지 */}
              <div className="flex-shrink-0 mb-4 md:mb-0">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                  {trainer.user.avatarMedia?.thumbnailUrl ? (
                    <img
                      src={trainer.user.avatarMedia.thumbnailUrl}
                      alt={trainer.user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users className="w-10 h-10 text-gray-400" />
                  )}
                </div>
              </div>

              {/* 기본 정보 */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      이름
                    </label>
                    <p className="text-lg font-semibold text-gray-900">
                      {trainer.user.username}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      이메일
                    </label>
                    <p className="text-gray-700 flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      {trainer.user.email}
                    </p>
                  </div>
                  {trainer.user.mobile && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        연락처
                      </label>
                      <p className="text-gray-700 flex items-center">
                        <Phone className="w-4 h-4 mr-2" />
                        {trainer.user.mobile}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      소속 센터
                    </label>
                    <p className="text-gray-700 flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      {trainer.fitnessCenter?.title || "센터 미배정"}
                    </p>
                    {trainer.fitnessCenter?.address && (
                      <p className="text-sm text-gray-500 ml-6">
                        {trainer.fitnessCenter.address}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      가입일
                    </label>
                    <p className="text-gray-700">
                      {formatDate(trainer.createdAt)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      상태
                    </label>
                    <Badge variant={trainer.working ? "default" : "default"}>
                      {trainer.working ? "활성" : "비활성"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* 트레이너 소개 정보 */}
            {trainer.introduce && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Award className="w-5 h-5 mr-2" />
                  트레이너 소개
                </h3>
                <div>
                  <p className="text-gray-700">{trainer.introduce}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PT 통계 카드 */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">총 PT</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {ptStats.total}개
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">진행 중</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {ptStats.confirmed}개
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">대기 중</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {ptStats.pending}개
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">총 수업</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {ptStats.totalSessions}회
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">완료율</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {overallCompletionRate}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PT 목록 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">PT 목록</h2>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                size="sm"
              >
                <Filter className="w-4 h-4 mr-2" />
                필터
              </Button>
            </div>
          </CardHeader>

          {showFilters && (
            <CardContent className="border-b border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                  variant={stateFilter === "ALL" ? "primary" : "outline"}
                  onClick={() => setStateFilter("ALL")}
                  size="sm"
                >
                  전체 ({ptStats.total})
                </Button>
                <Button
                  variant={stateFilter === "CONFIRMED" ? "primary" : "outline"}
                  onClick={() => setStateFilter("CONFIRMED")}
                  size="sm"
                >
                  진행 중 ({ptStats.confirmed})
                </Button>
                <Button
                  variant={stateFilter === "PENDING" ? "primary" : "outline"}
                  onClick={() => setStateFilter("PENDING")}
                  size="sm"
                >
                  대기 중 ({ptStats.pending})
                </Button>
                <Button
                  variant={stateFilter === "REJECTED" ? "primary" : "outline"}
                  onClick={() => setStateFilter("REJECTED")}
                  size="sm"
                >
                  거절됨 ({ptStats.rejected})
                </Button>
              </div>
            </CardContent>
          )}

          <CardContent>
            {ptLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : ptError ? (
              <div className="text-center py-8 text-red-600">
                PT 목록을 불러오는데 실패했습니다
              </div>
            ) : ptList.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                해당 조건의 PT가 없습니다
              </div>
            ) : (
              <div className="space-y-4">
                {ptList.map((pt) => {
                  const statusConfig = getPtStatusConfig(
                    pt.state,
                    pt.trainerConfirmed
                  );
                  const StatusIcon = statusConfig.icon;

                  return (
                    <Link
                      key={pt.id}
                      href={`/manager/trainers/${trainerId}/pt/${pt.id}`}
                      className="block"
                    >
                      <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {pt.ptProduct.title}
                              </h3>
                              <Badge variant={statusConfig.variant}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusConfig.text}
                              </Badge>
                              {pt.isRegular && (
                                <Badge variant="default">정기</Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                              <div>
                                <label className="text-sm font-medium text-gray-600">
                                  회원
                                </label>
                                <p className="text-gray-900 flex items-center">
                                  <Users className="w-4 h-4 mr-1" />
                                  {pt.member?.user.username || "알 수 없음"}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-600">
                                  시작일
                                </label>
                                <p className="text-gray-900">
                                  {formatDate(pt.startDate)}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-600">
                                  가격
                                </label>
                                <p className="text-gray-900">
                                  {pt.ptProduct.price.toLocaleString()}원
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-600">
                                  총 횟수
                                </label>
                                <p className="text-gray-900">
                                  {pt.ptProduct.totalCount}회
                                </p>
                              </div>
                            </div>

                            {/* PT 진행 상황 */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <p className="text-sm text-blue-600 font-medium">
                                  총 수업
                                </p>
                                <p className="text-lg font-semibold text-blue-700">
                                  {pt.stats.totalSessions}회
                                </p>
                              </div>
                              <div className="bg-green-50 p-3 rounded-lg">
                                <p className="text-sm text-green-600 font-medium">
                                  완료 수업
                                </p>
                                <p className="text-lg font-semibold text-green-700">
                                  {pt.stats.completedSessions}회
                                </p>
                              </div>
                              <div className="bg-purple-50 p-3 rounded-lg">
                                <p className="text-sm text-purple-600 font-medium">
                                  완료율
                                </p>
                                <p className="text-lg font-semibold text-purple-700">
                                  {pt.stats.completionRate}%
                                </p>
                              </div>
                            </div>

                            {/* 다음 예정 수업 */}
                            {pt.stats.nextSession && (
                              <div className="bg-yellow-50 p-3 rounded-lg">
                                <label className="text-sm font-medium text-yellow-600">
                                  다음 수업
                                </label>
                                <p className="text-yellow-700">
                                  {formatDateTime(
                                    pt.stats.nextSession.ptSchedule.date
                                  )}
                                  (
                                  {Math.floor(
                                    pt.stats.nextSession.ptSchedule.startTime /
                                      100
                                  )}
                                  :
                                  {String(
                                    pt.stats.nextSession.ptSchedule.startTime %
                                      100
                                  ).padStart(2, "0")}
                                  )
                                </p>
                              </div>
                            )}

                            {/* 설명 */}
                            {pt.description && (
                              <div className="mt-3">
                                <label className="text-sm font-medium text-gray-600">
                                  설명
                                </label>
                                <p className="text-gray-700 text-sm">
                                  {pt.description}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="ml-4">
                            <Eye className="w-5 h-5 text-gray-400" />
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
      </div>

      {/* 새로고침 시간 표시 */}
      {ptData?.timestamp && (
        <div className="text-center text-sm text-gray-500 mt-6">
          마지막 업데이트: {new Date(ptData.timestamp).toLocaleString("ko-KR")}
        </div>
      )}
    </PageLayout>
  );
}
