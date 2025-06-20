// app/trainer/pt-list/page.tsx
"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { PageLayout, PageHeader } from "@/app/components/ui/Dropdown";
import { Card, CardContent } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/Loading";
import { LoadingPage, ErrorMessage } from "@/app/components/ui/Loading";
import { Input } from "@/app/components/ui/Input";
import { ITrainerPtList } from "@/app/lib/services/trainer.service";

// API fetcher
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

const TrainerPtListPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "completed"
  >("all");

  // PT 목록 조회
  const {
    data: ptList,
    error,
    isLoading,
    mutate,
  } = useSWR<ITrainerPtList>("/api/trainer/pt-list", fetcher);

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

    if (date.toDateString() === today.toDateString()) {
      return "오늘";
    } else if (date < today) {
      return date.toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      });
    } else {
      return date.toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      });
    }
  };

  // PT 상태 결정
  const getPtStatus = (pt: ITrainerPtList[number]) => {
    if (pt.isActive) {
      return { text: "진행중", variant: "success" as const };
    } else {
      return { text: "완료", variant: "default" as const };
    }
  };

  // 진행률 계산
  const getProgressPercentage = (completed: number, total: number) => {
    return Math.round((completed / total) * 100);
  };

  // 필터링된 PT 목록
  const filteredPtList =
    ptList?.filter((pt) => {
      // 검색 필터
      const matchesSearch =
        searchQuery === "" ||
        pt.ptProduct.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pt.member.user.username
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      // 상태 필터
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && pt.isActive) ||
        (statusFilter === "completed" && !pt.isActive);

      return matchesSearch && matchesStatus;
    }) || [];

  // 로딩 상태
  if (isLoading) {
    return <LoadingPage message="PT 목록을 불러오는 중..." />;
  }

  // 에러 상태
  if (error) {
    return (
      <PageLayout maxWidth="lg">
        <ErrorMessage
          message="PT 목록을 불러올 수 없습니다."
          action={
            <Button variant="outline" onClick={() => mutate()}>
              다시 시도
            </Button>
          }
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="lg">
      {/* 헤더 */}
      <PageHeader
        title="내 PT 목록"
        subtitle={`총 ${ptList?.length || 0}개의 PT`}
      />

      {/* 검색 및 필터 */}
      <Card className="mb-6">
        <CardContent className="p-4 space-y-4">
          {/* 검색바 */}
          <Input
            placeholder="PT 프로그램 또는 회원 이름으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* 상태 필터 */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                statusFilter === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                statusFilter === "active"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              진행중
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                statusFilter === "completed"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              완료
            </button>
          </div>
        </CardContent>
      </Card>

      {/* PT 목록 */}
      {filteredPtList.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-4">📋</div>
            {ptList?.length === 0 ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  아직 진행 중인 PT가 없습니다
                </h3>
                <p className="text-gray-600">
                  회원들의 PT 신청을 기다려보세요!
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  검색 결과가 없습니다
                </h3>
                <p className="text-gray-600">다른 검색어를 입력해보세요.</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPtList.map((pt) => {
            const status = getPtStatus(pt);
            const progressPercentage = getProgressPercentage(
              pt.completedCount,
              pt.ptProduct.totalCount
            );

            return (
              <Card
                key={pt.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
              >
                <CardContent className="p-6">
                  {/* 헤더 */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {pt.member.user.username} 회원
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{pt.ptProduct.title}</span>
                        <span>•</span>
                        <span>회당 {pt.ptProduct.time}시간</span>
                      </div>
                    </div>
                    <Badge variant={status.variant}>{status.text}</Badge>
                  </div>

                  {/* 진행률 */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600">진행률</span>
                      <span className="font-medium">
                        {pt.completedCount}/{pt.ptProduct.totalCount}회 (
                        {progressPercentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* 다음 수업 정보 */}
                  {pt.nextSession && (
                    <div className="bg-blue-50 p-3 rounded-lg mb-4">
                      <div className="text-sm font-medium text-blue-900 mb-1">
                        다음 수업
                      </div>
                      <div className="text-sm text-blue-800">
                        {formatDate(pt.nextSession.date)}{" "}
                        {formatTime(pt.nextSession.startTime)}
                      </div>
                    </div>
                  )}

                  {/* 기본 정보 */}
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                    <div>
                      <span>시작일:</span>{" "}
                      <span className="font-medium">
                        {formatDate(pt.startDate)}
                      </span>
                    </div>
                    <div>
                      <span>연락처:</span>{" "}
                      <span className="font-medium">
                        {pt.member.user.phone}
                      </span>
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex gap-3">
                    {pt.nextSession && (
                      <Link
                        href={`/trainer/pt-records/${
                          pt.nextSession.recordId || "upcoming"
                        }`}
                        className="flex-1"
                      >
                        <Button variant="primary" className="w-full">
                          다음 수업 진행
                        </Button>
                      </Link>
                    )}
                    <Link href={`/trainer/pt/${pt.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        상세보기
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
};

export default TrainerPtListPage;
