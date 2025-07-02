"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  MapPin,
  Target,
  Dumbbell,
  Camera,
  FileText,
  CheckCircle,
  XCircle,
  Filter,
  Timer,
  Weight,
  RotateCcw,
  Activity,
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
  IPtRecordDetails,
  IPtRecordDetail,
} from "@/app/lib/services/trainer-management.service";

// 데이터 페처 함수
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("데이터를 불러오는데 실패했습니다");
  }
  return response.json();
};

// 운동 타입별 아이콘 함수
const getExerciseTypeIcon = (type: string) => {
  switch (type) {
    case "MACHINE":
      return Target;
    case "FREE":
      return Dumbbell;
    case "STRETCHING":
      return Activity;
    default:
      return Target;
  }
};

// 운동 타입별 스타일 함수
const getExerciseTypeStyle = (type: string) => {
  switch (type) {
    case "MACHINE":
      return {
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
        badgeText: "머신",
      };
    case "FREE":
      return {
        bgColor: "bg-green-50",
        textColor: "text-green-700",
        badgeText: "프리웨이트",
      };
    case "STRETCHING":
      return {
        bgColor: "bg-purple-50",
        textColor: "text-purple-700",
        badgeText: "스트레칭",
      };
    default:
      return {
        bgColor: "bg-gray-50",
        textColor: "text-gray-700",
        badgeText: "기타",
      };
  }
};

// 시간 포맷팅 함수
const formatTime = (time: number) => {
  const hours = Math.floor(time / 100);
  const minutes = time % 100;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
};

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function PtRecordDetailPage() {
  const params = useParams();
  const trainerId = params?.trainerId as string;
  const ptId = params?.ptId as string;

  const [completedFilter, setCompletedFilter] = useState<
    "ALL" | "COMPLETED" | "SCHEDULED"
  >("ALL");

  // API 쿼리 생성
  const queryParams = new URLSearchParams();
  if (completedFilter === "COMPLETED") queryParams.set("completed", "true");
  if (completedFilter === "SCHEDULED") queryParams.set("completed", "false");

  // 데이터 페칭
  const {
    data: recordsData,
    error: recordsError,
    isLoading: recordsLoading,
  } = useSWR<{
    ptRecords: IPtRecordDetails;
    trainerId: string;
    ptId: string;
  }>(
    `/api/manager/trainers/${trainerId}/pt/${ptId}?${queryParams.toString()}`,
    fetcher,
    {
      refreshInterval: 30000, // 30초마다 갱신
    }
  );

  // 로딩 상태
  if (recordsLoading) {
    return <LoadingPage message="수업 기록을 불러오는 중..." />;
  }

  // 에러 상태
  if (recordsError) {
    return (
      <PageLayout maxWidth="lg">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">
            수업 기록을 불러오는데 실패했습니다
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            다시 시도
          </Button>
        </div>
      </PageLayout>
    );
  }

  const records = recordsData?.ptRecords || [];

  if (records.length === 0) {
    return (
      <PageLayout maxWidth="lg">
        <PageHeader
          title={
            <div className="flex items-center space-x-3">
              <Link href={`/manager/trainers/${trainerId}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <span>수업 기록</span>
            </div>
          }
        />
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">수업 기록이 없습니다</p>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  // 첫 번째 기록에서 PT 정보 추출
  const ptInfo = records[0].pt;

  // 통계 계산
  const stats = {
    total: records.length,
    completed: records.filter((record) => record.items.length > 0).length,
    scheduled: records.filter((record) => record.items.length === 0).length,
  };

  return (
    <PageLayout maxWidth="lg">
      <PageHeader
        title={
          <div className="flex items-center space-x-3">
            <Link href={`/manager/trainers/${trainerId}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <span>수업 기록 상세</span>
          </div>
        }
        subtitle={`${ptInfo.member?.user.username}님의 ${ptInfo.ptProduct.title}`}
      />

      <div className="space-y-6">
        {/* PT 기본 정보 카드 */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">PT 기본 정보</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">회원</p>
                  <p className="font-semibold text-gray-900">
                    {ptInfo.member?.user.username}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">트레이너</p>
                  <p className="font-semibold text-gray-900">
                    {ptInfo.trainer?.user.username}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Target className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">프로그램</p>
                  <p className="font-semibold text-gray-900">
                    {ptInfo.ptProduct.title}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">수업 시간</p>
                  <p className="font-semibold text-gray-900">
                    {ptInfo.ptProduct.time}분
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">총 수업</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {stats.total}회
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
                  <p className="text-sm text-gray-600">완료</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {stats.completed}회
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
                  <p className="text-sm text-gray-600">예정</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {stats.scheduled}회
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 필터 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">필터:</span>
              <div className="flex space-x-2">
                <Button
                  variant={completedFilter === "ALL" ? "primary" : "outline"}
                  onClick={() => setCompletedFilter("ALL")}
                  size="sm"
                >
                  전체 ({stats.total})
                </Button>
                <Button
                  variant={
                    completedFilter === "COMPLETED" ? "primary" : "outline"
                  }
                  onClick={() => setCompletedFilter("COMPLETED")}
                  size="sm"
                >
                  완료 ({stats.completed})
                </Button>
                <Button
                  variant={
                    completedFilter === "SCHEDULED" ? "primary" : "outline"
                  }
                  onClick={() => setCompletedFilter("SCHEDULED")}
                  size="sm"
                >
                  예정 ({stats.scheduled})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 수업 기록 목록 */}
        <div className="space-y-6">
          {records.map((record) => {
            const isCompleted = record.items.length > 0;
            const sessionDate = new Date(record.ptSchedule.date);
            const startTime = formatTime(record.ptSchedule.startTime);
            const endTime = formatTime(record.ptSchedule.endTime);

            return (
              <Card
                key={record.id}
                className={isCompleted ? "border-green-200" : "border-gray-200"}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {formatDate(record.ptSchedule.date)}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {startTime} - {endTime} ({ptInfo.ptProduct.time}분)
                        </p>
                        <p className="text-sm text-gray-500">
                          {record.fitnessCeneter?.title}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {isCompleted ? (
                        <Badge variant="default">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          완료
                        </Badge>
                      ) : (
                        <Badge variant="default">
                          <Clock className="w-3 h-3 mr-1" />
                          예정
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* 기록 시간 분석 */}
                  {isCompleted && record.timeAnalysis && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Timer className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">
                          기록 시간 분석
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">수업 시작 시간</p>
                          <p className="font-medium text-gray-900">
                            {formatDateTime(
                              record.timeAnalysis.sessionStartTime.toISOString()
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">기록 작성 시간</p>
                          <p className="font-medium text-gray-900">
                            {formatDateTime(
                              record.timeAnalysis.recordedAt.toISOString()
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">시간 차이</p>
                          <p
                            className={`font-medium ${
                              record.timeAnalysis.minutesAfterStart >= 0
                                ? "text-green-700"
                                : "text-red-700"
                            }`}
                          >
                            {record.timeAnalysis.isRecordedAfterStart
                              ? `수업 시작 ${record.timeAnalysis.minutesAfterStart}분 후 기록됨`
                              : `수업 시작 ${Math.abs(
                                  record.timeAnalysis.minutesAfterStart
                                )}분 전 기록됨`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 운동 기록 */}
                  {isCompleted ? (
                    <div className="space-y-6">
                      {record.items.map((item, index) => {
                        const typeStyle = getExerciseTypeStyle(item.type);
                        const TypeIcon = getExerciseTypeIcon(item.type);

                        return (
                          <div
                            key={item.id}
                            className="border border-gray-200 rounded-lg p-4"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <div
                                  className={`p-2 ${typeStyle.bgColor} rounded-lg`}
                                >
                                  <TypeIcon
                                    className={`w-4 h-4 ${typeStyle.textColor}`}
                                  />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900">
                                    {item.title || `운동 ${item.entry}`}
                                  </h4>
                                  <Badge variant="default">
                                    {typeStyle.badgeText}
                                  </Badge>
                                </div>
                              </div>
                              <span className="text-sm text-gray-500">
                                #{item.entry}
                              </span>
                            </div>

                            {/* 운동별 상세 기록 */}
                            {item.type === "MACHINE" &&
                              item.machineSetRecords.length > 0 && (
                                <div className="mb-4">
                                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                                    머신 세트
                                  </h5>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {item.machineSetRecords.map((set) => (
                                      <div
                                        key={set.id}
                                        className="bg-blue-50 p-3 rounded-lg"
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-sm font-medium text-blue-700">
                                            {set.set}세트
                                          </span>
                                        </div>
                                        <div className="space-y-1 text-sm">
                                          {set.settingValues.map(
                                            (settingValue) => (
                                              <div key={settingValue.id}>
                                                <p>
                                                  <span className="text-gray-600">
                                                    기구:
                                                  </span>{" "}
                                                  {
                                                    settingValue.machineSetting
                                                      ?.machine?.title
                                                  }
                                                </p>
                                                <p>
                                                  <span className="text-gray-600">
                                                    설정:
                                                  </span>{" "}
                                                  {
                                                    settingValue.machineSetting
                                                      ?.title
                                                  }
                                                </p>
                                                <p>
                                                  <span className="text-gray-600">
                                                    값:
                                                  </span>{" "}
                                                  {settingValue.value}{" "}
                                                  {
                                                    settingValue.machineSetting
                                                      ?.unit
                                                  }
                                                </p>
                                              </div>
                                            )
                                          )}
                                          <p>
                                            <span className="text-gray-600">
                                              횟수:
                                            </span>{" "}
                                            {set.reps}회
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            {item.type === "FREE" &&
                              item.freeSetRecords.length > 0 && (
                                <div className="mb-4">
                                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                                    프리웨이트 세트
                                  </h5>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {item.freeSetRecords.map((set) => (
                                      <div
                                        key={set.id}
                                        className="bg-green-50 p-3 rounded-lg"
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-sm font-medium text-green-700">
                                            {set.set}세트
                                          </span>
                                        </div>
                                        <div className="space-y-1 text-sm">
                                          {set.weights.map((weight) => (
                                            <p key={weight.id}>
                                              <span className="text-gray-600">
                                                도구:
                                              </span>{" "}
                                              {weight.title} ({weight.weight}
                                              {weight.unit})
                                            </p>
                                          ))}
                                          <p>
                                            <span className="text-gray-600">
                                              횟수:
                                            </span>{" "}
                                            {set.reps}회
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            {item.type === "STRETCHING" &&
                              item.stretchingExerciseRecords.length > 0 && (
                                <div className="mb-4">
                                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                                    스트레칭
                                  </h5>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {item.stretchingExerciseRecords.map(
                                      (stretch, idx) => (
                                        <div
                                          key={stretch.id}
                                          className="bg-purple-50 p-3 rounded-lg"
                                        >
                                          <div className="space-y-1 text-sm">
                                            <p>
                                              <span className="text-gray-600">
                                                운동:
                                              </span>{" "}
                                              {
                                                stretch.stretchingExercise
                                                  ?.title
                                              }
                                            </p>
                                            {stretch.stretchingExercise
                                              ?.description && (
                                              <p>
                                                <span className="text-gray-600">
                                                  운동 설명:
                                                </span>{" "}
                                                {
                                                  stretch.stretchingExercise
                                                    .description
                                                }
                                              </p>
                                            )}
                                            {stretch.description && (
                                              <p>
                                                <span className="text-gray-600">
                                                  기록:
                                                </span>{" "}
                                                {stretch.description}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}

                            {/* 운동 설명 */}
                            {item.description && (
                              <div className="mb-4">
                                <h5 className="text-sm font-medium text-gray-700 mb-2">
                                  설명
                                </h5>
                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                  {item.description}
                                </p>
                              </div>
                            )}

                            {/* 사진 */}
                            {item.photos.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                  <Camera className="w-4 h-4 mr-1" />
                                  사진 ({item.photos.length}장)
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                  {item.photos.map((photo) => (
                                    <div
                                      key={photo.id}
                                      className="aspect-square bg-gray-200 rounded-lg overflow-hidden"
                                    >
                                      <img
                                        src={
                                          photo.thumbnailUrl || photo.publicUrl
                                        }
                                        alt="운동 사진"
                                        className="w-full h-full object-cover hover:scale-110 transition-transform cursor-pointer"
                                        onClick={() =>
                                          window.open(photo.publicUrl, "_blank")
                                        }
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* 메모 */}
                      {record.memo && (
                        <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                          <h5 className="text-sm font-medium text-yellow-700 mb-2 flex items-center">
                            <FileText className="w-4 h-4 mr-1" />
                            트레이너 메모
                          </h5>
                          <p className="text-sm text-yellow-700">
                            {record.memo}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p>아직 수업이 진행되지 않았습니다</p>
                      <p className="text-sm">
                        예정일: {formatDate(record.ptSchedule.date)} {startTime}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 새로고침 시간 표시 */}
      {recordsData?.timestamp && (
        <div className="text-center text-sm text-gray-500 mt-6">
          마지막 업데이트:{" "}
          {new Date(recordsData.timestamp).toLocaleString("ko-KR")}
        </div>
      )}
    </PageLayout>
  );
}
