// app/member/pt/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent, CardHeader } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { LoadingPage, ErrorMessage } from "@/app/components/ui/Loading";
import ProfileImagePreview from "@/app/components/media/ProfileImagePreview";
import { GetMemberActivePtResult } from "@/app/services/member/pt/pt.service";

// API fetcher
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

const MemberPtPage = () => {
  const router = useRouter();

  // 활성 PT 조회
  const {
    data: activePt,
    error,
    isLoading,
    mutate,
  } = useSWR<GetMemberActivePtResult>("/api/member/pt", fetcher);

  // 활성 PT가 없으면 대시보드로 리다이렉트
  useEffect(() => {
    if (!isLoading && activePt === null) {
      router.push("/member");
    }
  }, [activePt, isLoading, router]);

  // 로딩 상태
  if (isLoading) {
    return <LoadingPage message="PT 정보를 불러오는 중..." />;
  }

  // 에러 상태
  if (error) {
    return (
      <PageLayout>
        <ErrorMessage
          message="PT 정보를 불러올 수 없습니다."
          action={
            <Button variant="outline" onClick={() => mutate()}>
              다시 시도
            </Button>
          }
        />
      </PageLayout>
    );
  }

  // 활성 PT가 없으면 리다이렉트 처리 중 (빈 화면 방지)
  if (!activePt) {
    return <LoadingPage message="대시보드로 이동 중..." />;
  }

  return (
    <PageLayout>
      {/* 헤더 */}
      <PageHeader
        title="내 PT"
        subtitle={activePt.ptProduct.title}
        action={
          <Link href="/member/pt/new">
            <Button variant="outline" size="sm">
              새 PT 신청
            </Button>
          </Link>
        }
      />

      <div className="space-y-6">
        {/* PT 개요 카드 */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {activePt.ptProduct.title}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>회당 {activePt.ptProduct.time}분</span>
                  <span>•</span>
                  <span>{activePt.ptProduct.price.toLocaleString()}원</span>
                  <span>•</span>
                  <span>
                    시작일: {new Date(activePt.startDate).toLocaleDateString("ko-KR")}
                  </span>
                </div>
              </div>
              <Badge variant="success">진행중</Badge>
            </div>
          </CardHeader>
        </Card>

        {/* 진행률 카드 */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">진행 현황</h3>
                <span className="text-2xl font-bold text-blue-600">
                  {activePt.progress.percentage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${activePt.progress.percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  완료: {activePt.progress.completed}회 / {activePt.progress.total}회
                </span>
                <span>
                  잔여: {activePt.progress.total - activePt.progress.completed}회
                </span>
              </div>
            </div>

            {/* 다음 수업 정보 */}
            {activePt.nextLesson ? (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">📅</span>
                  <h4 className="font-medium text-blue-900">다음 수업</h4>
                </div>
                <p className="text-blue-800 text-sm">
                  {new Date(activePt.nextLesson.scheduledAt).toLocaleString("ko-KR", {
                    month: "long",
                    day: "numeric",
                    weekday: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  ({activePt.nextLesson.duration}분)
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">📅</span>
                  <h4 className="font-medium text-gray-700">다음 수업</h4>
                </div>
                <p className="text-gray-600 text-sm">
                  예정된 수업이 없습니다. 트레이너에게 문의하세요.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 트레이너 정보 카드 */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">담당 트레이너</h3>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 flex-shrink-0">
                <ProfileImagePreview
                  imageId={activePt.trainer?.user.avatarImage?.cloudflareId}
                  variant="avatar"
                  size="lg"
                  fallback={
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-2xl">👤</span>
                    </div>
                  }
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-lg font-medium text-gray-900 mb-1">
                  {activePt.trainer?.user.username || "트레이너 미배정"}
                </h4>
                {activePt.trainer?.introduce && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {activePt.trainer.introduce}
                  </p>
                )}
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span>🏢</span>
                    <span>{activePt.trainer?.fitnessCenter?.title}</span>
                  </div>
                  {activePt.trainer?.user.mobile && (
                    <div className="flex items-center gap-2">
                      <span>📞</span>
                      <a 
                        href={`tel:${activePt.trainer.user.mobile}`}
                        className="text-blue-600 hover:underline"
                      >
                        {activePt.trainer.user.mobile}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Link href={`/member/chat?trainerId=${activePt.trainer?.id}`}>
                  <Button variant="outline" size="sm">
                    채팅하기
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PT 목표 (있는 경우) */}
        {activePt.goals && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">PT 목표</h3>
              <p className="text-gray-700">{activePt.goals}</p>
            </CardContent>
          </Card>
        )}

        {/* 최근 수업 기록 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">최근 수업 기록</h3>
              <Link href={`/member/pt/${activePt.id}/lessons`}>
                <Button variant="ghost" size="sm">
                  전체 보기
                </Button>
              </Link>
            </div>
            
            {activePt.recentLessons.length > 0 ? (
              <div className="space-y-3">
                {activePt.recentLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            lesson.isCompleted ? "bg-green-500" : "bg-gray-300"
                          }`}
                        />
                        <span className="font-medium text-gray-900">
                          {new Date(lesson.scheduledAt).toLocaleDateString("ko-KR", {
                            month: "short",
                            day: "numeric",
                            weekday: "short",
                          })}
                        </span>
                        <span className="text-gray-500 text-sm">
                          {lesson.duration}분
                        </span>
                      </div>
                      {lesson.memo && (
                        <p className="text-sm text-gray-600 line-clamp-1">
                          {lesson.memo}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={lesson.isCompleted ? "success" : "default"}
                        size="sm"
                      >
                        {lesson.isCompleted ? "완료" : "예정"}
                      </Badge>
                      {lesson.recordsCount > 0 && (
                        <span className="text-xs text-gray-500">
                          기록 {lesson.recordsCount}개
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <p>아직 수업 기록이 없습니다.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default MemberPtPage;