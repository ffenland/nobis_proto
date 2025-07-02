"use client";

import React, { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  ArrowLeft,
  Users,
  Calendar,
  Target,
  Award,
  Activity,
  Phone,
  Mail,
  MapPin,
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  CreditCard,
  Gift,
} from "lucide-react";

import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { LoadingPage, Badge } from "@/app/components/ui/Loading";
import type {
  IMemberDetail,
  IMemberPtRecords,
} from "@/app/lib/services/member-management.service";

type Params = Promise<{ id: string }>;

// 날짜 포맷팅 함수
const formatDate = (dateString: string | Date) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

// 시간 포맷팅 함수 (분을 시:분으로 변환)
const formatTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}`;
};

// 데이터 페처 함수
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("데이터를 불러오는데 실패했습니다");
  }
  return response.json();
};

export default function MemberDetailPage(props: { params: Params }) {
  const [selectedPtId, setSelectedPtId] = useState<string>("");
  const [showPtRecords, setShowPtRecords] = useState<boolean>(false);

  // params 해결
  const params = React.use(props.params);
  const memberId = params.id;

  // 데이터 페칭
  const {
    data: memberData,
    error: memberError,
    isLoading: memberLoading,
  } = useSWR<{
    member: IMemberDetail;
    timestamp: string;
  }>(`/api/manager/members/${memberId}`, fetcher);

  const {
    data: recordsData,
    error: recordsError,
    isLoading: recordsLoading,
  } = useSWR<{
    records: IMemberPtRecords;
    timestamp: string;
  }>(
    showPtRecords
      ? `/api/manager/members/${memberId}/pt-records${
          selectedPtId ? `?ptId=${selectedPtId}` : ""
        }`
      : null,
    fetcher
  );

  // 로딩 상태
  if (memberLoading) {
    return <LoadingPage message="회원 정보를 불러오는 중..." />;
  }

  // 에러 상태
  if (memberError) {
    return (
      <PageLayout maxWidth="lg">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">
            {memberError.message.includes("404")
              ? "회원을 찾을 수 없습니다."
              : "데이터를 불러오는데 실패했습니다"}
          </p>
          <Link href="/manager/members">
            <Button variant="outline">목록으로 돌아가기</Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  const member = memberData?.member;
  if (!member) {
    return null;
  }

  const ptRecords = recordsData?.records || [];

  return (
    <PageLayout maxWidth="lg">
      {/* 뒤로가기 버튼 */}
      <div className="mb-4">
        <Link href="/manager/members">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로 돌아가기
          </Button>
        </Link>
      </div>

      <PageHeader
        title={`${member.user.username} 회원`}
        subtitle="회원 상세 정보 및 PT 이용 현황"
      />

      <div className="space-y-6">
        {/* 회원 기본 정보 */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">기본 정보</h2>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
              {/* 프로필 이미지 */}
              <div className="flex-shrink-0 mb-4 md:mb-0">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                  {member.user.avatarMedia?.thumbnailUrl ? (
                    <img
                      src={member.user.avatarMedia.thumbnailUrl}
                      alt={member.user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-gray-400" />
                  )}
                </div>
              </div>

              {/* 기본 정보 */}
              <div className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-600">회원명</div>
                      <div className="font-medium">{member.user.username}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-600">가입일</div>
                      <div className="font-medium">
                        {formatDate(member.user.createdAt)}
                      </div>
                    </div>
                  </div>
                  {member.user.email && (
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-600">이메일</div>
                        <div className="font-medium">{member.user.email}</div>
                      </div>
                    </div>
                  )}
                  {member.user.mobile && (
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-600">연락처</div>
                        <div className="font-medium">{member.user.mobile}</div>
                      </div>
                    </div>
                  )}
                  {member.fitnessCenter && (
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-5 h-5 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-600">소속 센터</div>
                        <div className="font-medium">
                          {member.fitnessCenter.title}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-3">
                    <Activity className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="text-sm text-gray-600">상태</div>
                      <Badge variant={member.active ? "default" : "error"}>
                        {member.active ? "활성" : "비활성"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PT 통계 카드 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">활성 PT</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {member.stats.totalActivePt}개
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
                  <p className="text-sm text-gray-600">완료 세션</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {member.stats.totalCompletedSessions}회
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
                  <p className="text-sm text-gray-600">남은 세션</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {member.stats.totalRemainingSessions}회
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">이용률</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {member.stats.ptUtilizationRate}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 현재 진행 중인 PT */}
        {member.pt.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">진행 중인 PT</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {member.pt.map((pt) => (
                  <div
                    key={pt.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {pt.ptProduct.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {pt.trainer?.user.username} 트레이너
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {pt.ptRecord.length} / {pt.ptProduct.totalCount}
                        </div>
                        <div className="text-sm text-gray-600">세션 진행률</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">시작일:</span>
                        <div className="font-medium">
                          {formatDate(pt.startDate)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">가격:</span>
                        <div className="font-medium">
                          {pt.ptProduct.price.toLocaleString()}원
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">세션 시간:</span>
                        <div className="font-medium">{pt.ptProduct.time}분</div>
                      </div>
                    </div>

                    {pt.description && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <span className="text-gray-600 text-sm">설명:</span>
                        <p className="text-gray-900 mt-1">{pt.description}</p>
                      </div>
                    )}

                    <div className="mt-4 flex justify-between items-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPtId(pt.id);
                          setShowPtRecords(true);
                        }}
                      >
                        PT 기록 보기
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 멤버십 정보 */}
        {member.membership.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">현재 멤버십</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {member.membership.map((membership) => (
                  <div
                    key={membership.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {membership.membershipProduct.title}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span>
                            시작:{" "}
                            {membership.startedAt
                              ? formatDate(membership.startedAt)
                              : "-"}
                          </span>
                          <span>
                            종료:{" "}
                            {membership.closedAt
                              ? formatDate(membership.closedAt)
                              : "무제한"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {membership.membershipProduct.price.toLocaleString()}
                          원
                        </div>
                        <Badge variant="success">활성</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 보유 쿠폰 */}
        {(member.ptCoupon.length > 0 || member.membershipCoupon.length > 0) && (
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">보유 쿠폰</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {member.ptCoupon.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="flex items-center justify-between border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Gift className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">PT 쿠폰</h3>
                        <p className="text-sm text-gray-600">
                          {coupon.discount}% 할인 (최대{" "}
                          {coupon.maxPrice.toLocaleString()}원)
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        {formatDate(coupon.openedAt)} ~{" "}
                        {formatDate(coupon.closedAt)}
                      </div>
                    </div>
                  </div>
                ))}
                {member.membershipCoupon.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="flex items-center justify-between border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Gift className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          멤버십 쿠폰
                        </h3>
                        <p className="text-sm text-gray-600">
                          {coupon.discount}% 할인 (최대{" "}
                          {coupon.maxPrice.toLocaleString()}원)
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        {formatDate(coupon.openedAt)} ~{" "}
                        {formatDate(coupon.closedAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* PT 기록 */}
        {showPtRecords && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">PT 기록</h2>
                <div className="flex items-center space-x-2">
                  {member.pt.length > 1 && (
                    <select
                      value={selectedPtId}
                      onChange={(e) => setSelectedPtId(e.target.value)}
                      className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">전체 PT</option>
                      {member.pt.map((pt) => (
                        <option key={pt.id} value={pt.id}>
                          {pt.ptProduct.title} - {pt.trainer?.user.username}
                        </option>
                      ))}
                    </select>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPtRecords(false)}
                  >
                    닫기
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {recordsLoading ? (
                <div className="text-center py-8">
                  <div className="text-gray-600">기록을 불러오는 중...</div>
                </div>
              ) : recordsError ? (
                <div className="text-center py-8">
                  <div className="text-red-600">
                    기록을 불러오는데 실패했습니다.
                  </div>
                </div>
              ) : ptRecords.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-600">PT 기록이 없습니다.</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {ptRecords.map((record) => {
                    return (
                      <div
                        key={record.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <CheckCircle className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {formatDate(record.ptSchedule.date)}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {record.pt.ptProduct.title} -{" "}
                                {record.pt.trainer?.user.username}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge variant="success">완료</Badge>
                            <div className="text-sm text-gray-600">
                              {formatTime(record.ptSchedule.startTime)} -{" "}
                              {formatTime(record.ptSchedule.endTime)}
                            </div>
                          </div>
                        </div>

                        {record.memo && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-600">
                              트레이너 노트:
                            </p>
                            <p className="text-gray-900">{record.memo}</p>
                          </div>
                        )}

                        {record.items.length > 0 && (
                          <div>
                            <p className="text-sm text-gray-600 mb-2">
                              운동 기록:
                            </p>
                            <div className="space-y-2">
                              {record.items.map((item) => (
                                <div
                                  key={item.id}
                                  className="bg-gray-50 p-3 rounded-lg"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      {item.type === "MACHINE" &&
                                        item.machineSetRecords.length > 0 && (
                                          <div>
                                            <h4 className="font-medium text-gray-900">
                                              {item.title || "머신 운동"}
                                            </h4>
                                            <div className="text-sm text-gray-600 mt-1">
                                              {item.machineSetRecords.map(
                                                (set, setIndex) => (
                                                  <span
                                                    key={setIndex}
                                                    className="mr-3"
                                                  >
                                                    {set.set}세트: {set.reps}회
                                                    {set.settingValues.map(
                                                      (setting, i) => (
                                                        <span key={i}>
                                                          {" "}
                                                          x {setting.value}
                                                          {
                                                            setting
                                                              .machineSetting
                                                              .unit
                                                          }
                                                        </span>
                                                      )
                                                    )}
                                                  </span>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      {item.type === "FREE" &&
                                        item.freeSetRecords.length > 0 && (
                                          <div>
                                            <h4 className="font-medium text-gray-900">
                                              {item.title || "프리 웨이트"}
                                            </h4>
                                            <div className="text-sm text-gray-600 mt-1">
                                              {item.freeSetRecords.map(
                                                (set, setIndex) => (
                                                  <span
                                                    key={setIndex}
                                                    className="mr-3"
                                                  >
                                                    {set.set}세트: {set.reps}회
                                                    x{" "}
                                                    {set.weights
                                                      .map(
                                                        (w) =>
                                                          `${w.weight}${w.unit}`
                                                      )
                                                      .join("+")}
                                                  </span>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      {item.type === "STRETCHING" &&
                                        item.stretchingExerciseRecords.length >
                                          0 && (
                                          <div>
                                            <h4 className="font-medium text-gray-900">
                                              {
                                                item
                                                  .stretchingExerciseRecords[0]
                                                  .stretchingExercise.title
                                              }
                                            </h4>
                                            {item.stretchingExerciseRecords[0]
                                              .description && (
                                              <p className="text-sm text-gray-600 mt-1">
                                                {
                                                  item
                                                    .stretchingExerciseRecords[0]
                                                    .description
                                                }
                                              </p>
                                            )}
                                          </div>
                                        )}
                                      {item.description && (
                                        <div className="mt-2">
                                          <p className="text-sm text-gray-600">
                                            {item.description}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                    <Badge variant="default">
                                      {item.type === "MACHINE"
                                        ? "머신"
                                        : item.type === "FREE"
                                        ? "프리웨이트"
                                        : "스트레칭"}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
