"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { LoadingPage, ErrorMessage } from "@/app/components/ui/Loading";
import {
  IMemberInfo,
  IPtSummary,
  IRecentRecord,
} from "@/app/lib/services/member.service";

// API fetcher
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

const MemberMainPage = () => {
  // 회원 기본 정보
  const {
    data: memberInfo,
    error: memberError,
    isLoading: memberLoading,
  } = useSWR<IMemberInfo>("/api/member/info", fetcher);

  // PT 요약 정보
  const {
    data: ptSummary,
    error: ptError,
    isLoading: ptLoading,
  } = useSWR<IPtSummary[]>("/api/member/pt-summary", fetcher);

  // 최근 운동 기록
  const {
    data: recentRecords,
    error: recordsError,
    isLoading: recordsLoading,
  } = useSWR<IRecentRecord[]>("/api/member/recent-records", fetcher);

  // 시간 포맷 함수
  const formatTime = (time: number) => {
    const hour = Math.floor(time / 100);
    const minute = time % 100;
    return `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
  };

  // 날짜 포맷 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "오늘";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "내일";
    } else {
      return `${date.getMonth() + 1}월 ${date.getDate()}일`;
    }
  };

  // 로딩 상태
  if (memberLoading) {
    return <LoadingPage message="정보를 불러오는 중..." />;
  }

  // 에러 상태
  if (memberError) {
    return (
      <PageLayout maxWidth="md">
        <ErrorMessage
          message="사용자 정보를 불러올 수 없습니다."
          action={
            <Button variant="outline" onClick={() => window.location.reload()}>
              다시 시도
            </Button>
          }
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="md">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          안녕하세요, {memberInfo?.username || "회원"}님! 👋
        </h1>
        <p className="text-gray-600">오늘도 건강한 하루 보내세요</p>
      </div>

      {/* 빠른 액션 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            빠른 메뉴
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/member/pt/new">
              <Button variant="primary" className="w-full h-16 flex-col">
                <span className="text-lg">💪</span>
                <span className="text-sm">PT 신청</span>
              </Button>
            </Link>
            <Link href="/member/pt">
              <Button variant="outline" className="w-full h-16 flex-col">
                <span className="text-lg">📋</span>
                <span className="text-sm">내 PT</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 예정된 PT 세션 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            예정된 PT
          </h2>

          {ptLoading ? (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-500 text-sm mt-2">로딩 중...</p>
            </div>
          ) : ptError ? (
            <ErrorMessage message="PT 정보를 불러올 수 없습니다." />
          ) : !ptSummary || ptSummary.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📅</div>
              <p className="text-gray-500 mb-4">예정된 PT가 없습니다</p>
              <Link href="/member/pt/new">
                <Button variant="outline" size="sm">
                  PT 신청하기
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {ptSummary.slice(0, 3).map((pt) => (
                <Link key={pt.id} href={`/member/pt/${pt.id}`}>
                  <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">
                        {pt.ptProduct.title}
                      </h3>
                      <Badge
                        variant={
                          !pt.trainerConfirmed
                            ? "warning"
                            : pt.isActive
                            ? "success"
                            : "default"
                        }
                      >
                        {!pt.trainerConfirmed
                          ? "승인대기"
                          : pt.isActive
                          ? "진행중"
                          : "완료"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {pt.trainer
                          ? pt.trainer.user.username
                          : "트레이너 배정 대기"}
                      </span>

                      {pt.upcomingSession && (
                        <span className="text-gray-900 font-medium">
                          {formatDate(pt.upcomingSession.date)}{" "}
                          {formatTime(pt.upcomingSession.startTime)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}

              {ptSummary.length > 3 && (
                <Link href="/member/pt">
                  <div className="text-center py-2">
                    <Button variant="ghost" size="sm">
                      전체 보기 ({ptSummary.length - 3}개 더)
                    </Button>
                  </div>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 최근 운동 기록 */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            최근 운동 기록
          </h2>

          {recordsLoading ? (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-500 text-sm mt-2">로딩 중...</p>
            </div>
          ) : recordsError ? (
            <ErrorMessage message="운동 기록을 불러올 수 없습니다." />
          ) : !recentRecords || recentRecords.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-gray-500">아직 운동 기록이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentRecords.slice(0, 5).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {formatDate(record.date)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {record.trainerName} 트레이너 · {record.exerciseCount}개
                      운동
                    </div>
                  </div>
                  <div className="text-2xl">💪</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 추가 메뉴 */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">더 보기</h2>
          <div className="space-y-3">
            <Link href="/member/membership">
              <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">🎫</span>
                  <span className="text-gray-900">회원권 관리</span>
                </div>
                <span className="text-gray-400">→</span>
              </div>
            </Link>

            <Link href="/member/payment">
              <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">💳</span>
                  <span className="text-gray-900">결제 내역</span>
                </div>
                <span className="text-gray-400">→</span>
              </div>
            </Link>

            <Link href="/member/profile">
              <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">⚙️</span>
                  <span className="text-gray-900">내 정보</span>
                </div>
                <span className="text-gray-400">→</span>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
};

export default MemberMainPage;
