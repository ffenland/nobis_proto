// app/trainer/pt/[id]/page.tsx
"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import { PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import {
  formatDateWithoutWeekday,
  formatTime,
  getTimeFromDateTime,
} from "@/app/lib/utils/time.utils";
import { toCurrencyString } from "@/app/lib/utils/format.utils";
import type { GetTrainerPtDetailResult } from "@/app/services/trainer/pt.service";

interface PageProps {
  params: Promise<{ id: string }>;
}

const TrainerPtDetailPage = ({ params }: PageProps) => {
  const { id } = use(params);

  // SWR로 데이터 페칭 - 타입 명시
  const {
    data: pt,
    error,
    isLoading,
  } = useSWR<GetTrainerPtDetailResult>(`/api/trainer/pt/${id}`);

  // 레슨 생성 가능 여부 체크 (useMemo는 조건부로 호출되면 안 되므로 early return 전에 위치)
  const canCreateLesson = useMemo(() => {
    if (!pt) return false;
    const nonCanceledLessons = pt.lessons.filter(
      (l) => l.status !== "cancelled"
    );
    return nonCanceledLessons.length < pt.ptProduct.totalCount;
  }, [pt]);

  console.log(pt);
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

  if (!pt) {
    return null;
  }

  // 진행률 계산
  const progressPercentage = (pt.currentLesson / pt.ptProduct.totalCount) * 100;

  // PT 상태별 색상 설정 (DB의 PtState enum 사용)
  const getStatusColor = (state: string) => {
    switch (state) {
      case "CONFIRMED":
        return "success"; // 진행중
      case "FINISHED":
        return "default"; // 완료
      case "PENDING":
        return "warning"; // 승인대기
      case "REJECTED":
        return "error"; // 거절됨
      case "REFUNDED":
        return "error"; // 환불됨
      default:
        return "default";
    }
  };

  // PT 상태별 텍스트 표시 (DB의 PtState enum 사용)
  const getStatusText = (state: string) => {
    switch (state) {
      case "CONFIRMED":
        return "진행중";
      case "FINISHED":
        return "완료";
      case "PENDING":
        return "승인대기";
      case "REJECTED":
        return "거절됨";
      case "REFUNDED":
        return "환불됨";
      default:
        return "알 수 없음";
    }
  };

  // 레슨 상태별 배지 색상
  const getLessonStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return { variant: "success" as const, text: "완료" };
      case "absence":
        return { variant: "error" as const, text: "불참" };
      case "scheduled":
        return { variant: "default" as const, text: "예정" };
      case "in-progress":
        return { variant: "warning" as const, text: "진행중" };
      case "cancelled":
        return { variant: "default" as const, text: "취소" };
      default:
        return { variant: "default" as const, text: status };
    }
  };

  // 날짜가 오늘인지 확인 (필요 시 사용)
  // const isToday = (dateStr: string) => {
  //   const today = new Date().toISOString().split("T")[0];
  //   return dateStr === today || dateStr === "2025-08-15"; // 더미데이터용
  // };
  return (
    <>
      {/* 메인 콘텐츠 영역 */}
      <div className="w-full">
          <div className="flex justify-between mx-2">
            <Link href="/trainer/pt">
              <Button variant="outline" size="sm">
                ←
              </Button>
            </Link>
            <div className="flex gap-2">
              <Link href={`/trainer/pt/${pt.id}/edit`}>
                <Button variant="outline" size="sm">
                  PT수정
                </Button>
              </Link>
            </div>
          </div>
          <div className="space-y-6 mt-2">
            {/* PT 상태 불일치 경고 배너 */}
            {pt.needsStateUpdate && (
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-amber-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">
                      PT 상태 업데이트 필요
                    </h3>
                    <div className="mt-2 text-sm text-amber-700">
                      <p>
                        모든 레슨이 완료되었지만 PT 상태가 아직
                        &quot;완료&quot;로 변경되지 않았습니다. PT수정 메뉴를
                        통해 완료처리를 해주세요.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PT 프로그램 정보 & 진행 상태 */}
            <Card>
              <CardContent>
                <div className="space-y-4 mt-4">
                  <div>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-lg font-bold text-gray-700">
                          {pt.memberName.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xl font-semibold text-gray-900">
                            {pt.ptProduct.title}
                          </h4>
                          <Badge variant={getStatusColor(pt.state)}>
                            {getStatusText(pt.state)}
                          </Badge>
                        </div>
                        <span>{pt.memberName}</span>
                        <p className="text-gray-600 text-sm">
                          📱 {pt.memberPhone}
                        </p>
                      </div>
                    </div>

                    {/* PT 목표 */}
                    {pt.memberGoals && pt.memberGoals.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          목표
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {pt.memberGoals.map((goal, index) => (
                            <span
                              key={index}
                              className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded"
                            >
                              {goal}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PT 설명 (트레이너 노트) */}
                    {pt.trainerNotes && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          메모
                        </p>
                        <p className="text-gray-600 text-sm bg-yellow-50 p-2 rounded">
                          {pt.trainerNotes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 진행 상태 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">진행 상태</span>
                      <span className="text-sm font-bold text-gray-900">
                        진행: {pt.currentLesson}/{pt.ptProduct.totalCount}회 (완료 {pt.stats.totalCompleted}회)
                      </span>
                    </div>

                    {/* 세그먼트 프로그레스 바 */}
                    <div className="w-full flex gap-0.5 h-4 rounded-full overflow-hidden bg-gray-200 mb-2">
                      {Array.from({ length: pt.ptProduct.totalCount }).map((_, index) => {
                        // lessons를 날짜순으로 정렬 (취소되지 않은 레슨만)
                        const sortedLessons = pt.lessons
                          .filter((l) => l.status !== "cancelled")
                          .sort(
                            (a, b) =>
                              new Date(a.scheduledAt).getTime() -
                              new Date(b.scheduledAt).getTime()
                          );

                        const lesson = sortedLessons[index];

                        // 레슨 상태에 따른 색상 결정
                        let bgColor = "bg-transparent"; // 기본값 (아직 등록되지 않은 레슨)

                        if (lesson) {
                          switch (lesson.status) {
                            case "completed":
                              bgColor = "bg-green-500"; // 완료된 레슨
                              break;
                            case "absence":
                              bgColor = "bg-red-500"; // 결석한 레슨
                              break;
                            case "in-progress":
                              bgColor = "bg-blue-500"; // 진행중인 레슨
                              break;
                            case "scheduled":
                              bgColor = "bg-gray-400"; // 예약된 레슨
                              break;
                          }
                        }

                        return (
                          <div
                            key={index}
                            className={`flex-1 ${bgColor} transition-colors`}
                            title={
                              lesson
                                ? `레슨 ${index + 1}: ${
                                    lesson.status === "completed"
                                      ? "완료"
                                      : lesson.status === "absence"
                                      ? "결석"
                                      : lesson.status === "in-progress"
                                      ? "진행중"
                                      : "예약됨"
                                  }`
                                : `레슨 ${index + 1}: 미등록`
                            }
                          />
                        );
                      })}
                    </div>

                    <div className="flex justify-between text-xs text-gray-600 mb-3">
                      <span>남은 횟수: {pt.remainingLessons}회</span>
                      <span>출석률: {pt.stats.attendanceRate}%</span>
                    </div>

                    {/* 프로그레스 바 범례 */}
                    <div className="flex items-center justify-center gap-4 text-xs text-gray-600 mb-3 pb-3 border-b">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-green-500" />
                        <span>완료</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-red-500" />
                        <span>결석</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-blue-500" />
                        <span>진행중</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-sm bg-gray-400" />
                        <span>예약</span>
                      </div>
                    </div>

                    {/* 수업 현황 통계 */}
                    <div className="pt-3">
                      <div className="grid grid-cols-4 gap-2">
                        <div className="text-center">
                          <div className="text-xs text-green-600">완료</div>
                          <div className="text-sm font-bold text-green-800">
                            {pt.stats.totalCompleted}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-red-600">불참</div>
                          <div className="text-sm font-bold text-red-800">
                            {pt.stats.totalAbsent}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-orange-600">임박</div>
                          <div className="text-sm font-bold text-orange-800">
                            {pt.stats.totalUpcoming}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-blue-600">예정</div>
                          <div className="text-sm font-bold text-blue-800">
                            {pt.stats.totalScheduled}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center items-center text-xs mt-4">
                      <span className="text-orange-600 text-opacity-70">
                        임박
                      </span>
                      <span className="text-gray-500 text-opacity-70">
                        은 24시간 이내의 레슨을 의미합니다.
                      </span>
                    </div>
                  </div>

                  {/* 기간 정보 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-xs text-blue-600">시작일</p>
                      <p className="text-sm font-bold text-blue-900">
                        {formatDateWithoutWeekday(new Date(pt.startDate))}
                      </p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-xs text-green-600">만료일</p>
                      <p className="text-sm font-bold text-green-900">
                        {pt.expiryDate
                          ? formatDateWithoutWeekday(new Date(pt.expiryDate))
                          : "미정"}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-xs text-purple-600">회당 시간</p>
                      <p className="text-sm font-bold text-purple-900">
                        {pt.ptProduct.sessionTime}분
                      </p>
                    </div>
                    {pt.payment ? (
                      <Link href={`/trainer/pt/${pt.id}/edit`}>
                        <div
                          className={`p-3 rounded-lg cursor-pointer transition-all hover:scale-105 bg-amber-50 hover:bg-amber-100`}
                        >
                          <div className="flex justify-between">
                            <p className={`text-xs text-amber-600`}>수업료</p>
                            <span className="text-xs text-amber-400">
                              클릭하여 수정하기
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <p className={`text-sm font-bold text-amber-900`}>
                              {toCurrencyString(pt.payment.amount)}원
                            </p>
                            <p
                              className={`text-xs ${
                                pt.payment.refundedAt
                                  ? "text-red-700"
                                  : pt.payment.paidAt
                                  ? "text-amber-700"
                                  : "text-blue-700"
                              }`}
                            >
                              {pt.payment.refundedAt
                                ? "환불완료"
                                : pt.payment.paidAt
                                ? "결제완료"
                                : "결제대기"}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600">가격</p>
                        <p className="text-sm font-bold text-gray-900">
                          {toCurrencyString(pt.ptProduct.price)}원
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 다음 수업 정보 */}
            {pt.nextLesson &&
              (pt.status === "active" || pt.status === "closing_soon") && (
                <Card className="border-blue-200 bg-blue-50/30">
                  <CardHeader className="pb-3">
                    <h3 className="text-lg font-semibold text-blue-900">
                      다음 수업
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-2xl font-bold text-blue-900">
                          {formatDateWithoutWeekday(pt.nextLesson.scheduledAt)}
                        </p>
                        <p className="text-lg text-blue-700">
                          {formatTime(getTimeFromDateTime(pt.nextLesson.scheduledAt))}
                        </p>
                      </div>
                      <Link href={`/trainer/lesson/${pt.nextLesson.id}/record`}>
                        <Button variant="primary">수업 기록하기</Button>
                      </Link>
                    </div>

                    {/* 추가 예정 수업들 */}
                    {(() => {
                      const futureLessons = pt.lessons
                        .filter(
                          (s) =>
                            s.status === "scheduled" &&
                            s.scheduledAt !== pt.nextLesson?.scheduledAt
                        )
                        .sort((a, b) => {
                          // scheduledAt으로 오름차순 정렬
                          return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
                        });

                      return futureLessons.length > 0 ? (
                        <div className="pt-4 border-t border-blue-200">
                          <p className="text-sm font-medium text-blue-800 mb-3">
                            예정된 수업
                          </p>
                          <div className="space-y-2">
                            {futureLessons.map((lesson) => (
                              <Link
                                key={lesson.id}
                                href={`/trainer/lesson/${lesson.id}`}
                                className="block"
                              >
                                <div className="bg-white/60 px-3 py-2 rounded-lg text-sm hover:bg-white/80 transition-colors cursor-pointer">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                      <span className="text-blue-700 font-medium">
                                        {formatDateWithoutWeekday(lesson.scheduledAt)}
                                      </span>
                                      <span className="text-blue-600">
                                        {formatTime(getTimeFromDateTime(lesson.scheduledAt))} -{" "}
                                        {formatTime(getTimeFromDateTime(lesson.endAt))}
                                      </span>
                                    </div>
                                    <span className="text-gray-400">→</span>
                                  </div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </CardContent>
                </Card>
              )}

            {/* 수업 기록 목록 - 과거 수업만 표시 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">수업 기록</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                      완료 {pt.stats.totalCompleted}회 / 불참{" "}
                      {pt.stats.totalAbsent}회
                    </span>
                    {(pt.status === "active" ||
                      pt.status === "closing_soon") && (
                      <Link
                        href={
                          canCreateLesson
                            ? `/trainer/pt/${pt.id}/new-lesson`
                            : "#"
                        }
                        onClick={(e) => {
                          if (!canCreateLesson) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={!canCreateLesson}
                        >
                          {canCreateLesson
                            ? "+ 새 수업 추가"
                            : "수업 횟수 소진"}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    // 과거 수업만 필터링 (completed, absence)
                    const pastLessons = pt.lessons.filter(
                      (s) => s.status === "completed" || s.status === "absence"
                    );

                    if (pastLessons.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-500">
                          아직 진행된 수업이 없습니다.
                        </div>
                      );
                    }

                    // 배열을 역순으로 뒤집어서 최신 레슨이 위로 오게 함
                    return [...pastLessons].reverse().map((lesson) => {
                      const statusBadge = getLessonStatusBadge(lesson.status);
                      return (
                        <div
                          key={lesson.id}
                          className={`border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer ${
                            lesson.status === "completed"
                              ? "border-gray-200 bg-white"
                              : "border-red-100 bg-red-50/30"
                          }`}
                        >
                          <Link href={`/trainer/lesson/${lesson.id}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-semibold text-gray-900">
                                    #{lesson.lessonNumber}
                                  </span>
                                  <Badge
                                    variant={statusBadge.variant}
                                    className="text-xs"
                                  >
                                    {statusBadge.text}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                  <span>{formatDateWithoutWeekday(lesson.scheduledAt)}</span>
                                  <span>
                                    {formatTime(getTimeFromDateTime(lesson.scheduledAt))} -{" "}
                                    {formatTime(getTimeFromDateTime(lesson.endAt))}
                                  </span>
                                </div>
                                {lesson.memo && (
                                  <p className="text-sm text-gray-700 mb-2">
                                    {lesson.memo}
                                  </p>
                                )}
                                {lesson.recordCount > 0 && (
                                  <div className="text-sm text-gray-600">
                                    레코드 {lesson.recordCount}개
                                  </div>
                                )}
                              </div>
                              <div className="text-gray-400">→</div>
                            </div>
                          </Link>
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* 취소된 수업 섹션 */}
            {(() => {
              const canceledLessons = pt.lessons.filter(
                (s) => s.status === "cancelled"
              );

              if (canceledLessons.length === 0) {
                return null;
              }

              return (
                <Card className="border-orange-200 bg-orange-50/30">
                  <CardHeader className="pb-3">
                    <h3 className="text-lg font-semibold text-orange-900">
                      취소된 수업 ({canceledLessons.length}회)
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[...canceledLessons].reverse().map((lesson) => (
                        <div
                          key={lesson.id}
                          className="border border-orange-200 rounded-lg p-4 bg-white/60"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge
                                  variant="default"
                                  className="text-xs bg-orange-100 text-orange-800"
                                >
                                  취소
                                </Badge>

                                {/* 비정상 취소 상태 체크 (레거시 데이터) */}
                                {!lesson.cancelInfo && (
                                  <Badge
                                    variant="default"
                                    className="text-xs bg-red-100 text-red-800 font-bold"
                                  >
                                    ⚠️ 비정상 취소 상태
                                  </Badge>
                                )}

                                {/* 승인 상태 표시 */}
                                {lesson.cancelInfo && (
                                  <>
                                    {lesson.cancelInfo.approvedAt ? (
                                      <Badge variant="success" className="text-xs">
                                        승인완료
                                      </Badge>
                                    ) : (
                                      <Badge variant="warning" className="text-xs">
                                        승인 대기중
                                      </Badge>
                                    )}

                                    {/* 취소 요청자 표시 */}
                                    {lesson.cancelInfo.canceledBy === "TRAINER" && (
                                      <Badge
                                        variant="default"
                                        className="text-xs bg-blue-100 text-blue-800"
                                      >
                                        트레이너 요청
                                      </Badge>
                                    )}
                                    {lesson.cancelInfo.canceledBy === "MEMBER" && (
                                      <Badge
                                        variant="default"
                                        className="text-xs bg-green-100 text-green-800"
                                      >
                                        회원 요청
                                      </Badge>
                                    )}
                                    {lesson.cancelInfo.canceledBy === "MANAGER" && (
                                      <Badge
                                        variant="default"
                                        className="text-xs bg-purple-100 text-purple-800"
                                      >
                                        매니저 요청
                                      </Badge>
                                    )}
                                  </>
                                )}
                              </div>

                              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                <span>{formatDateWithoutWeekday(lesson.scheduledAt)}</span>
                                <span>
                                  {formatTime(getTimeFromDateTime(lesson.scheduledAt))} -{" "}
                                  {formatTime(getTimeFromDateTime(lesson.endAt))}
                                </span>
                              </div>

                              {/* 취소 상세 정보 */}
                              {lesson.cancelInfo && (
                                <div className="mt-2 space-y-1">
                                  {/* 승인 매니저 표시 (승인완료 시에만) */}
                                  {lesson.cancelInfo.approvedAt &&
                                    lesson.cancelInfo.approvedBy?.user?.realname && (
                                      <p className="text-xs text-gray-600">
                                        승인: {lesson.cancelInfo.approvedBy.user.realname}
                                      </p>
                                    )}

                                  {/* 취소 사유 */}
                                  <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
                                    <span className="font-medium">사유:</span> {lesson.cancelInfo.reason}
                                  </div>
                                </div>
                              )}

                              {/* 레거시 memo 표시 (cancelInfo가 없는 경우에만) */}
                              {!lesson.cancelInfo && lesson.memo && (
                                <p className="text-sm text-gray-700 mt-2">
                                  {lesson.memo}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        </div>
    </>
  );
};

export default TrainerPtDetailPage;
