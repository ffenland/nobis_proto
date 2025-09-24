// app/trainer/pt/[id]/page.tsx
"use client";

import { use } from "react";
import Link from "next/link";
import useSWR from "swr";
import { PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardHeader, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { formatTime } from "@/app/lib/utils/time.utils";
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

  // 상태별 색상 설정
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "closing_soon":
        return "warning";
      case "completed":
        return "default";
      case "paused":
        return "error";
      default:
        return "default";
    }
  };

  // 레슨 상태별 배지 색상
  const getLessonStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return { variant: "success" as const, text: "완료" };
      case "absent":
        return { variant: "error" as const, text: "불참" };
      case "scheduled":
        return { variant: "default" as const, text: "예정" };
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
      {/* 반응형 컨테이너 */}
      <div className="lg:flex lg:gap-6">
        {/* 메인 콘텐츠 영역 */}
        <div className="lg:flex-1 lg:max-w-4xl">
          {/* 헤더 */}
          <div className="mb-6">
            <PageHeader
              title="PT 상세"
              subtitle={`${pt.memberName}님의 ${pt.ptProduct.title}`}
            />
          </div>

          {/* 뒤로가기 버튼 */}
          <Link href="/trainer/pt" className="inline-block mb-6">
            <Button variant="outline" size="sm">
              ← PT 목록으로 돌아가기
            </Button>
          </Link>

          <div className="space-y-6">
            {/* PT 프로그램 정보 & 진행 상태 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{pt.memberName}의 PT</h3>
                  <Badge variant={getStatusColor(pt.status)}>
                    {pt.status === "active"
                      ? "진행중"
                      : pt.status === "closing_soon"
                      ? "종료임박"
                      : pt.status === "completed"
                      ? "완료"
                      : "일시정지"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-lg font-bold text-gray-700">
                          {pt.memberName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xl font-semibold text-gray-900">
                          {pt.ptProduct.title}
                        </h4>
                        <p className="text-gray-600 text-sm">
                          📱 {pt.memberPhone}
                        </p>
                      </div>
                    </div>
                    
                    {/* PT 목표 */}
                    {pt.memberGoals && pt.memberGoals.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">목표</p>
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
                        <p className="text-sm font-medium text-gray-700 mb-1">메모</p>
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
                        {pt.currentLesson}/{pt.ptProduct.totalCount}회
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          pt.status === "completed"
                            ? "bg-gray-500"
                            : pt.status === "closing_soon"
                            ? "bg-amber-500"
                            : "bg-blue-500"
                        }`}
                        style={{
                          width: `${Math.min(progressPercentage, 100)}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>남은 횟수: {pt.remainingLessons}회</span>
                      <span>출석률: {pt.stats.attendanceRate}%</span>
                    </div>
                  </div>

                  {/* 기간 정보 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-xs text-blue-600">시작일</p>
                      <p className="text-sm font-bold text-blue-900">
                        {pt.startDate}
                      </p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-xs text-green-600">만료일</p>
                      <p className="text-sm font-bold text-green-900">
                        {pt.expiryDate}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-xs text-purple-600">회당 시간</p>
                      <p className="text-sm font-bold text-purple-900">
                        {pt.ptProduct.sessionTime}분
                      </p>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-lg">
                      <p className="text-xs text-amber-600">가격</p>
                      <p className="text-sm font-bold text-amber-900">
                        {(pt.ptProduct.price / 10000).toFixed(0)}만원
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 다음 수업 정보 */}
            {pt.nextLesson && pt.status === "active" && (
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
                        {pt.nextLesson.date}
                      </p>
                      <p className="text-lg text-blue-700">
                        {formatTime(pt.nextLesson.time)}
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
                          !s.isCanceled &&
                          s.status === "scheduled" &&
                          s.date !== pt.nextLesson?.date
                      )
                      .sort((a, b) => {
                        // 날짜 오름차순 정렬
                        const dateA = new Date(a.date).getTime();
                        const dateB = new Date(b.date).getTime();
                        if (dateA !== dateB) return dateA - dateB;
                        // 같은 날짜면 시간 오름차순
                        return a.startTime - b.startTime;
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
                                      {lesson.date}
                                    </span>
                                    <span className="text-blue-600">
                                      {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
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
                    {pt.status === "active" && (
                      <Link href={`/trainer/pt/${pt.id}/new-lesson`}>
                        <Button variant="primary" size="sm">
                          + 새 수업 추가
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    // 과거 수업만 필터링 (completed, absent, 취소되지 않은 레슨)
                    const pastLessons = pt.lessons.filter(
                      (s) =>
                        !s.isCanceled &&
                        (s.status === "completed" || s.status === "absent")
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
                                  <span>{lesson.date}</span>
                                  <span>
                                    {formatTime(lesson.startTime)} -{" "}
                                    {formatTime(lesson.endTime)}
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
              const canceledLessons = pt.lessons.filter((s) => s.isCanceled);

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
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="default" className="text-xs bg-orange-100 text-orange-800">
                                  취소
                                </Badge>
                                {lesson.managerCheckedAt ? (
                                  <Badge variant="success" className="text-xs">
                                    매니저 확인
                                  </Badge>
                                ) : (
                                  <Badge variant="warning" className="text-xs">
                                    매니저 확인 대기중
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                <span>{lesson.date}</span>
                                <span>
                                  {formatTime(lesson.startTime)} -{" "}
                                  {formatTime(lesson.endTime)}
                                </span>
                              </div>
                              {lesson.memo && (
                                <p className="text-sm text-gray-700">
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

        {/* 사이드바 영역 - 태블릿 이상에서만 표시 */}
        <div className="hidden lg:block lg:w-80">
          <div className="sticky top-4 space-y-4">
            {/* 빠른 통계 */}
            <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-indigo-900 mb-4">
                  운동 통계
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-indigo-700">완료 레슨</span>
                    <span className="font-bold text-indigo-900">
                      {pt.stats.totalCompleted}회
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-indigo-700">불참 레슨</span>
                    <span className="font-bold text-indigo-900">
                      {pt.stats.totalAbsent}회
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-indigo-700">평균 레코드 수</span>
                    <span className="font-bold text-indigo-900">
                      {pt.stats.averageRecords}개
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 빠른 액션 */}
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-purple-900 mb-4">
                  빠른 작업
                </h3>
                <div className="space-y-2">
                  <Link href={`/trainer/pt/${pt.id}/record`} className="block">
                    <Button variant="outline" className="w-full justify-start">
                      📝 수업 기록 작성
                    </Button>
                  </Link>
                  <Link
                    href={`/trainer/pt/${pt.id}/schedule`}
                    className="block"
                  >
                    <Button variant="outline" className="w-full justify-start">
                      📅 일정 변경
                    </Button>
                  </Link>
                  <Link href={`/trainer/pt/${pt.id}/extend`} className="block">
                    <Button variant="outline" className="w-full justify-start">
                      🔄 PT 연장/재등록
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full justify-start">
                    ⏸️ PT 일시정지
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

export default TrainerPtDetailPage;
